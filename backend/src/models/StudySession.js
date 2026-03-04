const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema(
  {
    initiatedBy: {
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
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
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
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "StudySession",
  }
);

studySessionSchema.index({ initiatedBy: 1, date: 1, startTime: 1 });
studySessionSchema.index({ moduleRef: 1, date: 1 });

module.exports = mongoose.model("StudySession", studySessionSchema);
