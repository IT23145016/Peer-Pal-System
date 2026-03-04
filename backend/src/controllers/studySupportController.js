const BatchTopHelpRequest = require("../models/BatchTopHelpRequest");
const Module = require("../models/Module");
const ProposedSession = require("../models/ProposedSession");
const SessionVote = require("../models/SessionVote");
const StudySession = require("../models/StudySession");
const User = require("../models/User");
const { sendProposalApprovedEmails } = require("../utils/mailer");

const isBatchTopUser = (user) => !!user?.isBatchTop;
const BATCH_TOP_SESSION_THRESHOLD = 1;
const PROPOSAL_APPROVAL_THRESHOLD = 2;

const listBatchTops = async (req, res) => {
  try {
    const users = await User.find({
      role: "user",
      isActive: { $ne: false },
      isBatchTop: true,
    })
      .select("name avatar moduleSpecialization academicYear semester batch")
      .sort({ name: 1 });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch batch tops", error: error.message });
  }
};

const createBatchTopRequest = async (req, res) => {
  try {
    const { moduleId, note, targetBatchTop } = req.body;
    const normalizedNote = typeof note === "string" ? note.trim() : "";
    if (!moduleId || !normalizedNote || !targetBatchTop) {
      return res.status(400).json({ message: "moduleId, note and targetBatchTop are required" });
    }

    const [moduleItem, batchTopUser] = await Promise.all([
      Module.findById(moduleId).select("moduleCode moduleName academicYear semester"),
      User.findById(targetBatchTop).select("isBatchTop role isActive"),
    ]);
    if (!moduleItem) return res.status(404).json({ message: "Module not found" });
    if (!batchTopUser || !isBatchTopUser(batchTopUser) || batchTopUser.role !== "user" || batchTopUser.isActive === false) {
      return res.status(400).json({ message: "Selected target user is not an active Batch Top" });
    }

    const duplicate = await BatchTopHelpRequest.findOne({
      requestedBy: req.user.userId,
      targetBatchTop,
      moduleRef: moduleItem._id,
      status: "pending",
    });
    if (duplicate) {
      return res.status(409).json({ message: "You already have a pending request for this Batch Top and module" });
    }

    const created = await BatchTopHelpRequest.create({
      requestedBy: req.user.userId,
      targetBatchTop,
      moduleRef: moduleItem._id,
      moduleCode: moduleItem.moduleCode,
      moduleName: moduleItem.moduleName,
      note: normalizedNote,
      status: "pending",
    });

    const pendingCount = await BatchTopHelpRequest.countDocuments({
      targetBatchTop,
      moduleRef: moduleItem._id,
      status: "pending",
    });

    return res.status(201).json({
      message: "Request sent to Batch Top",
      request: created,
      pendingCount,
      canStartSession: pendingCount >= BATCH_TOP_SESSION_THRESHOLD,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create request", error: error.message });
  }
};

const listMyBatchTopRequests = async (req, res) => {
  try {
    const items = await BatchTopHelpRequest.find({ requestedBy: req.user.userId })
      .populate("targetBatchTop", "name avatar moduleSpecialization")
      .sort({ createdAt: -1 });
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch your requests", error: error.message });
  }
};

const listBatchTopPendingGroups = async (req, res) => {
  try {
    const me = await User.findById(req.user.userId).select("isBatchTop");
    if (!isBatchTopUser(me)) return res.status(403).json({ message: "Only Batch Tops can access this resource" });

    const groups = await BatchTopHelpRequest.aggregate([
      {
        $match: {
          targetBatchTop: me._id,
          status: "pending",
        },
      },
      {
        $group: {
          _id: "$moduleRef",
          moduleCode: { $first: "$moduleCode" },
          moduleName: { $first: "$moduleName" },
          requestCount: { $sum: 1 },
          participantIds: { $addToSet: "$requestedBy" },
        },
      },
      { $sort: { requestCount: -1, moduleCode: 1 } },
    ]);

    const normalized = groups.map((item) => ({
      moduleId: item._id,
      moduleCode: item.moduleCode,
      moduleName: item.moduleName,
      requestCount: item.requestCount,
      participantCount: item.participantIds.length,
      canStartSession: item.requestCount >= BATCH_TOP_SESSION_THRESHOLD,
    }));
    return res.status(200).json(normalized);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch batch top summary", error: error.message });
  }
};

const startBatchTopSession = async (req, res) => {
  try {
    const me = await User.findById(req.user.userId).select("isBatchTop");
    if (!isBatchTopUser(me)) return res.status(403).json({ message: "Only Batch Tops can start sessions" });

    const { moduleId, date, startTime, endTime, meetingLink } = req.body;
    if (!moduleId || !date || !startTime || !endTime || !meetingLink) {
      return res.status(400).json({ message: "moduleId, date, startTime, endTime and meetingLink are required" });
    }

    const pendingRequests = await BatchTopHelpRequest.find({
      targetBatchTop: req.user.userId,
      moduleRef: moduleId,
      status: "pending",
    }).select("requestedBy moduleCode moduleName moduleRef");

    if (pendingRequests.length < BATCH_TOP_SESSION_THRESHOLD) {
      return res.status(400).json({ message: "At least 1 pending request is required to start a session" });
    }

    const first = pendingRequests[0];
    const participants = [...new Set(pendingRequests.map((item) => String(item.requestedBy)))];

    const session = await StudySession.create({
      initiatedBy: req.user.userId,
      moduleRef: first.moduleRef,
      moduleCode: first.moduleCode,
      moduleName: first.moduleName,
      participants,
      date,
      startTime,
      endTime,
      meetingLink: meetingLink.trim(),
    });

    await BatchTopHelpRequest.updateMany(
      {
        targetBatchTop: req.user.userId,
        moduleRef: moduleId,
        status: "pending",
      },
      {
        $set: { status: "accepted" },
      }
    );

    return res.status(201).json({ message: "Study session started", session });
  } catch (error) {
    return res.status(500).json({ message: "Failed to start session", error: error.message });
  }
};

const listBatchTopSessions = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const items = await StudySession.find({
      date: { $gte: today },
    })
      .populate("initiatedBy", "name")
      .sort({ date: 1, startTime: 1, createdAt: -1 });
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch study sessions", error: error.message });
  }
};

const createProposedSession = async (req, res) => {
  try {
    const { moduleId, description, date, startTime, endTime } = req.body;
    const normalizedDescription = typeof description === "string" ? description.trim() : "";
    if (!moduleId || !normalizedDescription || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "moduleId, description, date, startTime and endTime are required" });
    }
    const moduleItem = await Module.findById(moduleId).select("moduleCode moduleName");
    if (!moduleItem) return res.status(404).json({ message: "Module not found" });

    const created = await ProposedSession.create({
      createdBy: req.user.userId,
      moduleRef: moduleItem._id,
      moduleCode: moduleItem.moduleCode,
      moduleName: moduleItem.moduleName,
      description: normalizedDescription,
      date,
      startTime,
      endTime,
      likes: 0,
      dislikes: 0,
      status: "pending",
    });

    return res.status(201).json({ message: "Proposed session created", session: created });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create proposed session", error: error.message });
  }
};

const listProposedSessions = async (req, res) => {
  try {
    const sessions = await ProposedSession.find({})
      .populate("createdBy", "name avatar")
      .sort({ createdAt: -1 });

    const votes = await SessionVote.find({ userId: req.user.userId }).select("sessionId voteType");
    const voteMap = new Map(votes.map((v) => [String(v.sessionId), v.voteType]));

    const withMeta = sessions.map((item) => ({
      ...item.toObject(),
      myVote: voteMap.get(String(item._id)) || null,
      canCreateSession: item.status === "approved" && !item.linkedStudySession,
    }));
    return res.status(200).json(withMeta);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch proposed sessions", error: error.message });
  }
};

const voteProposedSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { voteType } = req.body;
    if (!["like", "dislike"].includes(voteType)) {
      return res.status(400).json({ message: "voteType must be like or dislike" });
    }

    const session = await ProposedSession.findById(id);
    if (!session) return res.status(404).json({ message: "Proposed session not found" });

    const existing = await SessionVote.findOne({ userId: req.user.userId, sessionId: id });
    if (existing) return res.status(409).json({ message: "You already voted for this session" });

    await SessionVote.create({ userId: req.user.userId, sessionId: id, voteType });

    if (voteType === "like") session.likes += 1;
    if (voteType === "dislike") session.dislikes += 1;

    let approvalNotice = null;
    if (session.likes >= PROPOSAL_APPROVAL_THRESHOLD && session.status !== "approved") {
      session.status = "approved";
      const likeVoters = await SessionVote.find({ sessionId: id, voteType: "like" }).select("userId");
      const userIds = likeVoters.map((v) => v.userId);
      const recipients = await User.find({ _id: { $in: userIds }, isActive: { $ne: false } }).select("email");
      const result = await sendProposalApprovedEmails({ recipients, proposal: session });
      approvalNotice = {
        approved: true,
        emailSentCount: result.sent,
        emailSkipped: result.skipped,
      };
    }

    await session.save();
    return res.status(200).json({
      message: "Vote saved",
      likes: session.likes,
      dislikes: session.dislikes,
      status: session.status,
      approvalNotice,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save vote", error: error.message });
  }
};

const createSessionFromProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, meetingLink } = req.body;
    if (!date || !startTime || !endTime || !meetingLink) {
      return res.status(400).json({ message: "date, startTime, endTime and meetingLink are required" });
    }

    const proposal = await ProposedSession.findById(id);
    if (!proposal) return res.status(404).json({ message: "Proposed session not found" });
    if (String(proposal.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Only proposal creator can create session from this proposal" });
    }
    if (proposal.status !== "approved") {
      return res.status(400).json({ message: "Proposal must be approved before creating a session" });
    }
    if (proposal.linkedStudySession) {
      return res.status(409).json({ message: "Session already created for this proposal" });
    }

    const likes = await SessionVote.find({ sessionId: proposal._id, voteType: "like" }).select("userId");
    const participants = [...new Set(likes.map((item) => String(item.userId)))];

    const session = await StudySession.create({
      initiatedBy: req.user.userId,
      moduleRef: proposal.moduleRef,
      moduleCode: proposal.moduleCode,
      moduleName: proposal.moduleName,
      participants,
      date,
      startTime,
      endTime,
      meetingLink: meetingLink.trim(),
    });

    proposal.meetingLink = meetingLink.trim();
    proposal.linkedStudySession = session._id;
    await proposal.save();

    return res.status(201).json({ message: "Study session created from proposal", session });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create session from proposal", error: error.message });
  }
};

const setProposedSessionMeetingLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { meetingLink } = req.body;
    const normalized = typeof meetingLink === "string" ? meetingLink.trim() : "";
    if (!normalized) return res.status(400).json({ message: "meetingLink is required" });

    const session = await ProposedSession.findById(id);
    if (!session) return res.status(404).json({ message: "Proposed session not found" });
    if (String(session.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Only proposal creator can set meeting link" });
    }
    if (session.status !== "approved") {
      return res.status(400).json({ message: "Meeting link can be set only after proposal approval" });
    }

    session.meetingLink = normalized;
    await session.save();
    return res.status(200).json({ message: "Meeting link updated", session });
  } catch (error) {
    return res.status(500).json({ message: "Failed to set meeting link", error: error.message });
  }
};

module.exports = {
  listBatchTops,
  createBatchTopRequest,
  listMyBatchTopRequests,
  listBatchTopPendingGroups,
  startBatchTopSession,
  listBatchTopSessions,
  createProposedSession,
  listProposedSessions,
  voteProposedSession,
  setProposedSessionMeetingLink,
  createSessionFromProposal,
};
