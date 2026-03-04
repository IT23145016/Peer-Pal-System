const mongoose = require("mongoose");

const proposedSessionSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    moduleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    moduleCode: {
      type: String,
      required: true,
      trim: true,
    },
    moduleName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    meetingLink: {
      type: String,
      default: "",
      trim: true,
    },
    linkedStudySession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudySession",
      default: null,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    collection: "ProposedSession",
  }
);

proposedSessionSchema.index({ status: 1, likes: -1, createdAt: -1 });
proposedSessionSchema.index({ createdBy: 1, createdAt: -1 });
proposedSessionSchema.index({ linkedStudySession: 1 });

module.exports = mongoose.model("ProposedSession", proposedSessionSchema);
