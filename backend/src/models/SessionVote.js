const mongoose = require("mongoose");

const sessionVoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProposedSession",
      required: true,
    },
    voteType: {
      type: String,
      enum: ["like", "dislike"],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "SessionVote",
  }
);

sessionVoteSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
sessionVoteSchema.index({ sessionId: 1, voteType: 1 });

module.exports = mongoose.model("SessionVote", sessionVoteSchema);
