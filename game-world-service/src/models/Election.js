const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    displayName: { type: String, required: true },
    slogan: { type: String, default: '' },
    votes: { type: Number, default: 0 },
  },
  { _id: false }
);

const ElectionSchema = new mongoose.Schema(
  {
    termNumber: { type: Number, required: true, unique: true },
    status: { type: String, enum: ['open', 'completed'], default: 'open' },
    candidates: { type: [CandidateSchema], default: [] },
    voters: { type: [String], default: [] }, // userIds who've already voted this term
    votingEndsAt: { type: Date, required: true },
    winner: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Election', ElectionSchema);
