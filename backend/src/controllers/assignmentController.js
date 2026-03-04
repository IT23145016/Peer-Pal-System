const Assignment = require("../models/Assignment");
const AssignmentProgress = require("../models/AssignmentProgress");
const Module = require("../models/Module");
const User = require("../models/User");
const { sendAssignmentDueSoonEmails } = require("../utils/mailer");

const createAssignment = async (req, res) => {
  try {
    const { moduleId, assignmentName, publishedDate, deadline } = req.body;
    const normalizedName = typeof assignmentName === "string" ? assignmentName.trim() : "";

    if (!moduleId || !normalizedName || !publishedDate || !deadline) {
      return res.status(400).json({ message: "moduleId, assignmentName, publishedDate and deadline are required" });
    }

    const moduleItem = await Module.findById(moduleId);
    if (!moduleItem) return res.status(404).json({ message: "Module not found" });

    const published = new Date(publishedDate);
    const due = new Date(deadline);
    if (Number.isNaN(published.getTime()) || Number.isNaN(due.getTime())) {
      return res.status(400).json({ message: "Invalid publishedDate or deadline" });
    }
    if (due < published) {
      return res.status(400).json({ message: "Deadline must be on or after published date" });
    }

    const assignment = await Assignment.create({
      moduleRef: moduleItem._id,
      moduleCode: moduleItem.moduleCode,
      moduleName: moduleItem.moduleName,
      assignmentName: normalizedName,
      publishedDate: published,
      deadline: due,
      academicYear: moduleItem.academicYear,
      semester: moduleItem.semester,
      createdBy: req.user.userId,
    });

    const now = Date.now();
    const dueEndOfDay = new Date(due);
    dueEndOfDay.setHours(23, 59, 59, 999);
    const dueInMs = dueEndOfDay.getTime() - now;
    const isDueWithinOneDay = dueInMs > 0 && dueInMs <= 24 * 60 * 60 * 1000;

    const recipients = await User.find({
      role: "user",
      isActive: { $ne: false },
      academicYear: moduleItem.academicYear,
      semester: moduleItem.semester,
    }).select("email");

    let emailNotice = {
      publishedNotification: true,
      dueSoonNotification: isDueWithinOneDay,
      reason: "Not sent",
      sentCount: 0,
      skipped: true,
    };

    try {
      const result = await sendAssignmentDueSoonEmails({
        recipients,
        assignment,
        isUrgent: isDueWithinOneDay,
      });
      emailNotice = {
        publishedNotification: true,
        dueSoonNotification: isDueWithinOneDay,
        reason: result.skipped ? "SMTP not configured or no recipients" : "Sent",
        sentCount: result.sent,
        skipped: result.skipped,
      };
    } catch (mailError) {
      emailNotice = {
        publishedNotification: true,
        dueSoonNotification: isDueWithinOneDay,
        sentCount: 0,
        skipped: false,
        reason: "Mailer error",
        error: mailError.message,
      };
    }

    return res.status(201).json({ message: "Assignment published", assignment, emailNotice });
  } catch (error) {
    return res.status(500).json({ message: "Failed to publish assignment", error: error.message });
  }
};

const listAssignments = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const assignments = await Assignment.find({}).sort({ deadline: 1, createdAt: -1 });
      return res.status(200).json(assignments);
    }

    const user = await User.findById(req.user.userId).select("academicYear semester");
    if (!user?.academicYear || !user?.semester) {
      return res.status(200).json([]);
    }

    const assignments = await Assignment.find({
      academicYear: user.academicYear,
      semester: user.semester,
    }).sort({ deadline: 1, createdAt: -1 });

    const progresses = await AssignmentProgress.find({ userId: req.user.userId });
    const progressMap = new Map(progresses.map((p) => [String(p.assignmentId), p.status]));

    const withStatus = assignments.map((item) => ({
      ...item.toObject(),
      trackerStatus: progressMap.get(String(item._id)) || "pending",
    }));

    return res.status(200).json(withStatus);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch assignments", error: error.message });
  }
};

const updateAssignmentProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["done", "not_completed"].includes(status)) {
      return res.status(400).json({ message: "status must be done or not_completed" });
    }

    const assignment = await Assignment.findById(id).select("academicYear semester");
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    if (req.user.role === "user") {
      const user = await User.findById(req.user.userId).select("academicYear semester");
      if (!user || assignment.academicYear !== user.academicYear || assignment.semester !== user.semester) {
        return res.status(403).json({ message: "This assignment is not available for your year/semester" });
      }
    }

    const progress = await AssignmentProgress.findOneAndUpdate(
      { assignmentId: id, userId: req.user.userId },
      { status, updatedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ message: "Assignment tracker updated", progress });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update assignment tracker", error: error.message });
  }
};

module.exports = { createAssignment, listAssignments, updateAssignmentProgress };
