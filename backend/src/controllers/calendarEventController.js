const CalendarEvent = require("../models/CalendarEvent");
const Assignment = require("../models/Assignment");
const Module = require("../models/Module");
const ProposedSession = require("../models/ProposedSession");
const User = require("../models/User");

const toDateOnly = (value) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTime12 = (value) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "11:59 PM";
  return dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const parseClockTime = (value) => {
  if (typeof value !== "string") return null;
  const text = value.trim().toUpperCase();
  if (!text) return null;

  const ampmMatch = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2]);
    const meridiem = ampmMatch[3];
    if (hour === 12) hour = 0;
    if (meridiem === "PM") hour += 12;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return hour * 60 + minute;
    return null;
  }

  const twentyFourMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hour = Number(twentyFourMatch[1]);
    const minute = Number(twentyFourMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return hour * 60 + minute;
  }
  return null;
};

const toDateTime = (date, time) => {
  const minutes = parseClockTime(time);
  if (minutes === null) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00`);
};

const listCalendarEvents = async (req, res) => {
  try {
    const from = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const to = typeof req.query.to === "string" ? req.query.to.trim() : "";
    const filter = { userId: req.user.userId };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const manualEvents = await CalendarEvent.find(filter).sort({ date: 1, time: 1, createdAt: -1 });

    let assignmentFilter = {};
    if (req.user.role !== "admin") {
      const user = await User.findById(req.user.userId).select("academicYear semester");
      if (!user?.academicYear || !user?.semester) {
        assignmentFilter = { _id: null };
      } else {
        assignmentFilter = { academicYear: user.academicYear, semester: user.semester };
      }
    }

    if (from || to) {
      assignmentFilter.deadline = {};
      if (from) assignmentFilter.deadline.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) assignmentFilter.deadline.$lte = new Date(`${to}T23:59:59.999Z`);
    }

    const assignments = await Assignment.find(assignmentFilter).sort({ deadline: 1, createdAt: -1 });
    const assignmentEvents = assignments.map((item) => ({
      _id: `assignment-${item._id}`,
      userId: req.user.userId,
      title: item.assignmentName,
      type: "assignment",
      date: toDateOnly(item.deadline),
      time: toTime12(item.deadline),
      source: "assignment_deadline",
      assignmentId: item._id,
      moduleCode: item.moduleCode,
      moduleName: item.moduleName,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const proposedFilter = {};
    if (from || to) {
      proposedFilter.date = {};
      if (from) proposedFilter.date.$gte = from;
      if (to) proposedFilter.date.$lte = to;
    }

    const proposedSessions = await ProposedSession.find(proposedFilter).sort({ date: 1, startTime: 1, createdAt: -1 });
    const proposedSessionEvents = proposedSessions.map((item) => ({
      _id: `proposed-${item._id}`,
      userId: req.user.userId,
      title: `${item.moduleCode} Proposed Session`,
      type: "study",
      date: item.date,
      time: item.startTime,
      endTime: item.endTime,
      source: "proposed_session",
      proposedSessionId: item._id,
      moduleCode: item.moduleCode,
      moduleName: item.moduleName,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const merged = [
      ...manualEvents.map((item) => ({ ...item.toObject(), source: "manual" })),
      ...assignmentEvents,
      ...proposedSessionEvents,
    ].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    return res.status(200).json(merged);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch calendar events", error: error.message });
  }
};

const createCalendarEvent = async (req, res) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const type = typeof req.body.type === "string" ? req.body.type.trim() : "";
    const date = typeof req.body.date === "string" ? req.body.date.trim() : "";
    const time = typeof req.body.time === "string" ? req.body.time.trim() : "";
    const endTime = typeof req.body.endTime === "string" ? req.body.endTime.trim() : "";
    const venue = typeof req.body.venue === "string" ? req.body.venue.trim() : "";
    const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";
    const moduleId = typeof req.body.moduleId === "string" ? req.body.moduleId.trim() : "";

    if (!title || !date || !time) {
      return res.status(400).json({ message: "title, date and time are required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "date must be in YYYY-MM-DD format" });
    }
    if (type && !["personal", "study", "assignment"].includes(type)) {
      return res.status(400).json({ message: "type must be personal, study or assignment" });
    }
    const startMinutes = parseClockTime(time);
    if (startMinutes === null) {
      return res.status(400).json({ message: "time must be a valid time" });
    }
    if (endTime) {
      const endMinutes = parseClockTime(endTime);
      if (endMinutes === null) {
        return res.status(400).json({ message: "endTime must be a valid time" });
      }
      if (endMinutes <= startMinutes) {
        return res.status(400).json({ message: "endTime must be after time" });
      }
    }

    const normalizedType = type || "study";

    if (normalizedType === "assignment") {
      if (!moduleId) return res.status(400).json({ message: "moduleId is required for assignment entries" });
      const moduleItem = await Module.findById(moduleId);
      if (!moduleItem) return res.status(404).json({ message: "Module not found" });

      const publishedDate = new Date();
      const deadline = toDateTime(date, endTime || time);
      if (!deadline || Number.isNaN(deadline.getTime())) {
        return res.status(400).json({ message: "Invalid deadline date/time" });
      }
      if (deadline < publishedDate) {
        return res.status(400).json({ message: "Deadline must be in the future" });
      }

      const created = await Assignment.create({
        moduleRef: moduleItem._id,
        moduleCode: moduleItem.moduleCode,
        moduleName: moduleItem.moduleName,
        assignmentName: title,
        publishedDate,
        deadline,
        academicYear: moduleItem.academicYear,
        semester: moduleItem.semester,
        createdBy: req.user.userId,
      });
      return res.status(201).json({ message: "Assignment deadline created", event: created, targetTable: "Assignment" });
    }

    if (normalizedType === "study") {
      if (!moduleId) return res.status(400).json({ message: "moduleId is required for study session entries" });
      if (!endTime) return res.status(400).json({ message: "endTime is required for study session entries" });

      const moduleItem = await Module.findById(moduleId);
      if (!moduleItem) return res.status(404).json({ message: "Module not found" });

      const created = await ProposedSession.create({
        createdBy: req.user.userId,
        moduleRef: moduleItem._id,
        moduleCode: moduleItem.moduleCode,
        moduleName: moduleItem.moduleName,
        description: notes || title,
        date,
        startTime: time,
        endTime,
        likes: 0,
        dislikes: 0,
        status: "pending",
      });

      return res.status(201).json({ message: "Proposed study session created", event: created, targetTable: "ProposedSession" });
    }

    const created = await CalendarEvent.create({
      userId: req.user.userId,
      title,
      type: normalizedType,
      date,
      time,
      endTime,
      venue,
      notes,
    });

    return res.status(201).json({ message: "Personal calendar event created", event: created, targetTable: "CalendarEvent" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create calendar event", error: error.message });
  }
};

module.exports = { listCalendarEvents, createCalendarEvent };
