const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema(
  {
    moduleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      immutable: true,
    },
    moduleCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    moduleName: {
      type: String,
      required: true,
      trim: true,
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
  {
    timestamps: true,
    collection: "Module",
  }
);

moduleSchema.index({ academicYear: 1, semester: 1, moduleCode: 1 });

module.exports = mongoose.model("Module", moduleSchema);
