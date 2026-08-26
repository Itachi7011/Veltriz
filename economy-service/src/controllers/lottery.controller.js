const { LotteryTicket, LotteryDraw } = require('../models/Lottery');
const { creditWallet, debitWallet, InsufficientFundsError } = require('../utils/walletService');
const logger = require('../utils/logger');

const TICKET_PRICE = 10;
const DRAW_INTERVAL_MS = 30 * 60 * 1000; // a new draw every 30 real-minutes
const HOUSE_CUT_PERCENT = 10; // the rest of ticket sales fund the jackpot

const getOrOpenDraw = async () => {
  let draw = await LotteryDraw.findOne({ status: 'open' }).sort({ drawNumber: -1 });
  if (!draw) {
    const last = await LotteryDraw.findOne().sort({ drawNumber: -1 });
    draw = await LotteryDraw.create({
      drawNumber: (last?.drawNumber || 0) + 1,
      drawAt: new Date(Date.now() + DRAW_INTERVAL_MS),
    });
  }
  return draw;
};

// ---------------------------------------------------------------------------
// GET /api/lottery/me
// ---------------------------------------------------------------------------
const getStatus = async (req, res, next) => {
  try {
    await resolveDrawIfDue();
    const draw = await getOrOpenDraw();
    const myTickets = await LotteryTicket.countDocuments({ user: req.user.id, drawNumber: draw.drawNumber });
    const lastCompleted = await LotteryDraw.findOne({ status: 'completed' }).sort({ drawNumber: -1 });

    return res.json({
      success: true,
      drawNumber: draw.drawNumber,
      jackpot: draw.jackpot,
      drawAt: draw.drawAt,
      ticketPrice: TICKET_PRICE,
      myTickets,
      lastResult: lastCompleted
        ? { drawNumber: lastCompleted.drawNumber, winner: lastCompleted.winner, payout: lastCompleted.winningPayout }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/lottery/buy  { quantity }
// ---------------------------------------------------------------------------
const buyTickets = async (req, res, next) => {
  try {
    await resolveDrawIfDue();
    const quantity = Math.min(Math.max(parseInt(req.body.quantity, 10) || 1, 1), 50);
    const draw = await getOrOpenDraw();
    const cost = TICKET_PRICE * quantity;

    try {
      await debitWallet(req.user.id, cost, { type: 'LOTTERY_TICKET', description: `Lottery: ${quantity} ticket(s)` });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: `Not enough VC — ${quantity} ticket(s) cost ${cost} VC.` });
      }
      throw err;
    }

    const tickets = Array.from({ length: quantity }, () => ({ user: req.user.id, drawNumber: draw.drawNumber }));
    await LotteryTicket.insertMany(tickets);

    draw.jackpot += Math.round(cost * (1 - HOUSE_CUT_PERCENT / 100));
    await draw.save();

    return res.json({ success: true, message: `Bought ${quantity} ticket(s) for draw #${draw.drawNumber}.`, jackpot: draw.jackpot });
  } catch (err) {
    next(err);
  }
};

/**
 * Picks a random ticket from the draw as the winner and pays out the whole
 * jackpot. Exported so the cron (cron/lotteryDraw.js) can call the same
 * logic instead of duplicating it.
 */
const resolveDrawIfDue = async () => {
  const draw = await LotteryDraw.findOne({ status: 'open' });
  if (!draw || Date.now() < new Date(draw.drawAt).getTime()) return;

  const tickets = await LotteryTicket.find({ drawNumber: draw.drawNumber });
  if (tickets.length > 0) {
    const winningTicket = tickets[Math.floor(Math.random() * tickets.length)];
    await creditWallet(winningTicket.user, draw.jackpot, {
      type: 'LOTTERY_WIN',
      description: `Lottery: won draw #${draw.drawNumber}`,
    });
    draw.winner = winningTicket.user;
    draw.winningPayout = draw.jackpot;
    logger.info(`[economy-service] Lottery draw #${draw.drawNumber} won by ${winningTicket.user} for ${draw.jackpot} VC`);
  }
  draw.status = 'completed';
  await draw.save();

  await LotteryDraw.create({ drawNumber: draw.drawNumber + 1, drawAt: new Date(Date.now() + DRAW_INTERVAL_MS) });
};

module.exports = { getStatus, buyTickets, resolveDrawIfDue, DRAW_INTERVAL_MS };
