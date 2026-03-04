const HelpRequest = require("../models/HelpRequest");
const Module = require("../models/Module");

const toResponse = (doc, currentUserId) => {
  const plain = doc.toObject ? doc.toObject() : doc;
  const ownerId = plain.createdBy?._id ? String(plain.createdBy._id) : String(plain.createdBy);
  const safeDocuments = Array.isArray(plain.documents)
    ? plain.documents.map((item) => ({
        _id: item._id,
        fileName: item.fileName,
        fileType: item.fileType,
        fileData: item.fileData,
        uploadedBy: item.uploadedBy,
        uploadedAt: item.uploadedAt,
        approved: !!item.approved,
        approvedBy: item.approvedBy || null,
        approvedAt: item.approvedAt || null,
      }))
    : [];
  return {
    ...plain,
    documents: safeDocuments,
    isOwner: ownerId === String(currentUserId),
    hasDocuments: safeDocuments.length > 0,
  };
};

const createHelpRequest = async (req, res) => {
  try {
    const { moduleId, message, priority, status } = req.body;
    const normalizedMessage = typeof message === "string" ? message.trim() : "";
    const normalizedPriority = priority === "urgent" ? "urgent" : "medium";
    const normalizedStatus = ["open", "in_progress", "received"].includes(status) ? status : "open";

    if (!moduleId || !normalizedMessage) {
      return res.status(400).json({ message: "moduleId and message are required" });
    }

    const moduleItem = await Module.findById(moduleId).select("moduleCode moduleName");
    if (!moduleItem) {
      return res.status(404).json({ message: "Module not found" });
    }

    const created = await HelpRequest.create({
      moduleRef: moduleItem._id,
      moduleCode: moduleItem.moduleCode,
      moduleName: moduleItem.moduleName,
      message: normalizedMessage,
      priority: normalizedPriority,
      status: normalizedStatus,
      createdBy: req.user.userId,
    });

    return res.status(201).json({ message: "Help request created", request: created });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create help request", error: error.message });
  }
};

const listHelpRequests = async (req, res) => {
  try {
    const requests = await HelpRequest.find({})
      .populate("createdBy", "name email")
      .populate("documents.uploadedBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json(requests.map((item) => toResponse(item, req.user.userId)));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch help requests", error: error.message });
  }
};

const listMyHelpRequests = async (req, res) => {
  try {
    const requests = await HelpRequest.find({ createdBy: req.user.userId })
      .populate("createdBy", "name email")
      .populate("documents.uploadedBy", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json(requests.map((item) => toResponse(item, req.user.userId)));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch your help requests", error: error.message });
  }
};

const updateHelpRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await HelpRequest.findById(id);
    if (!existing) return res.status(404).json({ message: "Help request not found" });

    if (String(existing.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Only the request owner can edit this request" });
    }
    if (existing.documents.length > 0) {
      return res.status(400).json({ message: "Cannot edit request after documents are submitted" });
    }

    const { moduleId, message, priority, status } = req.body;
    const updates = {};

    if (moduleId) {
      const moduleItem = await Module.findById(moduleId).select("moduleCode moduleName");
      if (!moduleItem) return res.status(404).json({ message: "Module not found" });
      updates.moduleRef = moduleItem._id;
      updates.moduleCode = moduleItem.moduleCode;
      updates.moduleName = moduleItem.moduleName;
    }
    if (typeof message === "string" && message.trim()) {
      updates.message = message.trim();
    }
    if (["urgent", "medium"].includes(priority)) {
      updates.priority = priority;
    }
    if (["open", "in_progress", "received"].includes(status)) {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const updated = await HelpRequest.findByIdAndUpdate(id, updates, { new: true })
      .populate("createdBy", "name email")
      .populate("documents.uploadedBy", "name");

    return res.status(200).json({ message: "Help request updated", request: toResponse(updated, req.user.userId) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update help request", error: error.message });
  }
};

const deleteHelpRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await HelpRequest.findById(id);
    if (!existing) return res.status(404).json({ message: "Help request not found" });

    const canDelete = String(existing.createdBy) === String(req.user.userId) || req.user.role === "admin";
    if (!canDelete) {
      return res.status(403).json({ message: "Only owner or admin can delete this request" });
    }

    await HelpRequest.findByIdAndDelete(id);
    return res.status(200).json({ message: "Help request deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete help request", error: error.message });
  }
};

const uploadHelpDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, fileType, fileData } = req.body;
    const normalizedName = typeof fileName === "string" ? fileName.trim() : "";
    const normalizedType = typeof fileType === "string" ? fileType.trim() : "";
    const normalizedData = typeof fileData === "string" ? fileData : "";

    if (!normalizedName || !normalizedData) {
      return res.status(400).json({ message: "fileName and fileData are required" });
    }
    if (normalizedData.length > 2_000_000) {
      return res.status(400).json({ message: "Document is too large" });
    }

    const request = await HelpRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Help request not found" });

    request.documents.push({
      fileName: normalizedName,
      fileType: normalizedType,
      fileData: normalizedData,
      uploadedBy: req.user.userId,
      approved: false,
      approvedBy: null,
      approvedAt: null,
    });
    request.status = "received";
    await request.save();

    const populated = await HelpRequest.findById(id)
      .populate("createdBy", "name email")
      .populate("documents.uploadedBy", "name");

    return res.status(200).json({
      message: "Document uploaded. Request marked as received.",
      request: toResponse(populated, req.user.userId),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to upload document", error: error.message });
  }
};

const approveHelpDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const request = await HelpRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Help request not found" });

    const isOwner = String(request.createdBy) === String(req.user.userId);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Only request owner or admin can approve documents" });
    }

    const targetDoc = request.documents.id(documentId);
    if (!targetDoc) return res.status(404).json({ message: "Document not found" });

    if (String(targetDoc.uploadedBy) === String(req.user.userId)) {
      return res.status(400).json({ message: "Uploader cannot approve their own document" });
    }

    targetDoc.approved = true;
    targetDoc.approvedBy = req.user.userId;
    targetDoc.approvedAt = new Date();
    request.status = "received";
    await request.save();

    const populated = await HelpRequest.findById(id)
      .populate("createdBy", "name email")
      .populate("documents.uploadedBy", "name")
      .populate("documents.approvedBy", "name");

    return res.status(200).json({
      message: "Document approved successfully",
      request: toResponse(populated, req.user.userId),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve document", error: error.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const minDocs = Number(req.query.minDocs) || 5;

    const leaderboard = await HelpRequest.aggregate([
      { $unwind: "$documents" },
      {
        $match: {
          "documents.approved": true,
        },
      },
      {
        $match: {
          $expr: { $ne: ["$documents.uploadedBy", "$createdBy"] },
        },
      },
      {
        $group: {
          _id: "$documents.uploadedBy",
          approvedDocsCount: { $sum: 1 },
          helpedRequestsCount: { $addToSet: "$_id" },
          lastApprovedAt: { $max: "$documents.approvedAt" },
        },
      },
      {
        $project: {
          approvedDocsCount: 1,
          helpedRequestsCount: { $size: "$helpedRequestsCount" },
          lastApprovedAt: 1,
          points: { $multiply: ["$approvedDocsCount", 10] },
        },
      },
      {
        $match: {
          approvedDocsCount: { $gte: minDocs },
        },
      },
      {
        $lookup: {
          from: "User",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          name: "$user.name",
          email: "$user.email",
          avatar: "$user.avatar",
          approvedDocsCount: 1,
          helpedRequestsCount: 1,
          points: 1,
          lastApprovedAt: 1,
        },
      },
      { $sort: { points: -1, approvedDocsCount: -1, lastApprovedAt: -1 } },
      { $limit: 20 },
    ]);

    return res.status(200).json(leaderboard);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch leaderboard", error: error.message });
  }
};

module.exports = {
  createHelpRequest,
  listHelpRequests,
  listMyHelpRequests,
  updateHelpRequest,
  deleteHelpRequest,
  uploadHelpDocument,
  approveHelpDocument,
  getLeaderboard,
};
