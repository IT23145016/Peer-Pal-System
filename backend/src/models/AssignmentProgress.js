const mongoose = require("mongoose");

const assignmentProgressSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["done", "not_completed"],
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, collection: "AssignmentProgress" }
);

assignmentProgressSchema.index({ assignmentId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("AssignmentProgress", assignmentProgressSchema);
