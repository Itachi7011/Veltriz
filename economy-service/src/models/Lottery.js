const mongoose = require('mongoose');

const LotteryTicketSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    drawNumber: { type: Number, required: true },
    purchasedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
LotteryTicketSchema.index({ drawNumber: 1 });

const LotteryDrawSchema = new mongoose.Schema(
  {
    drawNumber: { type: Number, required: true, unique: true },
    status: { type: String, enum: ['open', 'completed'], default: 'open' },
    jackpot: { type: Number, default: 0 }, // grows as tickets are sold this draw
    drawAt: { type: Date, required: true },
    winner: { type: String, default: null },
    winningPayout: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const LotteryTicket = mongoose.model('LotteryTicket', LotteryTicketSchema);
const LotteryDraw = mongoose.model('LotteryDraw', LotteryDrawSchema);

module.exports = { LotteryTicket, LotteryDraw };
