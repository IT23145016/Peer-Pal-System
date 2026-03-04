const mongoose = require("mongoose");

const helpRequestSchema = new mongoose.Schema(
  {
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
    message: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["urgent", "medium"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "received"],
      default: "open",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documents: [
      {
        fileName: { type: String, required: true, trim: true },
        fileType: { type: String, default: "", trim: true },
        fileData: { type: String, required: true },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        uploadedAt: { type: Date, default: Date.now },
        approved: { type: Boolean, default: false },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        approvedAt: { type: Date, default: null },
      },
    ],
  },
  {
    timestamps: true,
    collection: "HelpRequest",
  }
);

helpRequestSchema.index({ priority: 1, status: 1, createdAt: -1 });
helpRequestSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model("HelpRequest", helpRequestSchema);
