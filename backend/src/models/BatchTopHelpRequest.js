const mongoose = require("mongoose");

const batchTopHelpRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetBatchTop: {
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
    note: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    collection: "BatchTopHelpRequest",
  }
);

batchTopHelpRequestSchema.index({ targetBatchTop: 1, moduleRef: 1, status: 1, createdAt: -1 });
batchTopHelpRequestSchema.index({ requestedBy: 1, targetBatchTop: 1, moduleRef: 1, status: 1 });

module.exports = mongoose.model("BatchTopHelpRequest", batchTopHelpRequestSchema);
