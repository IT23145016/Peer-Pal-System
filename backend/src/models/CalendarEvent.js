const mongoose = require("mongoose");

const calendarEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      enum: ["personal", "study", "assignment"],
      default: "study",
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    time: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    endTime: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20,
    },
    venue: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: "CalendarEvent",
  }
);

calendarEventSchema.index({ userId: 1, date: 1, time: 1 });

module.exports = mongoose.model("CalendarEvent", calendarEventSchema);
