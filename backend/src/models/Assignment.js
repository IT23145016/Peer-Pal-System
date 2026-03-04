const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
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
    assignmentName: {
      type: String,
      required: true,
      trim: true,
    },
    publishedDate: {
      type: Date,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    academicYear: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    semester: {
      type: Number,
      required: true,
      enum: [1, 2],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

assignmentSchema.index({ academicYear: 1, semester: 1, deadline: 1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
