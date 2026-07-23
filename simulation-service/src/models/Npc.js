const mongoose = require('mongoose');

/**
 * NPCs are intentionally NOT rows in economy-service's real Wallet/
 * Employment collections. They're a self-contained simulation here —
 * their "wealth" is a number in this document, not real Veltriz Coins.
 * This keeps AI population activity from polluting the real player
 * financial ledger while still letting NPCs feel present: they hold
 * jobs, earn, spend, and their purchases nudge live market prices (see
 * cron/npcEngine.js) so players can feel the population exists.
 */
const NpcSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    jobKey: { type: String, required: true }, // matches a Job.key in economy-service
    wealth: { type: Number, default: 0 },

    personality: {
      riskTolerance: { type: Number, default: 0.5, min: 0, max: 1 },
      ambition: { type: Number, default: 0.5, min: 0, max: 1 },
      spendingHabit: { type: Number, default: 0.5, min: 0, max: 1 }, // higher = buys more often
    },

    totalShiftsWorked: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    lastActionAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Npc', NpcSchema);
