const Npc = require('../models/Npc');
const { economyPublic, economyInternal } = require('../services/economyClient');
const logger = require('../utils/logger');

let jobsCache = { data: [], fetchedAt: 0 };
let marketCache = { data: [], fetchedAt: 0 };
const CACHE_TTL_MS = 60000;

const getJobs = async () => {
  if (Date.now() - jobsCache.fetchedAt < CACHE_TTL_MS && jobsCache.data.length) return jobsCache.data;
  const { data } = await economyPublic.get('/api/jobs');
  jobsCache = { data: data.jobs, fetchedAt: Date.now() };
  return jobsCache.data;
};

const getMarketItems = async () => {
  if (Date.now() - marketCache.fetchedAt < CACHE_TTL_MS && marketCache.data.length) return marketCache.data;
  const { data } = await economyPublic.get('/api/market');
  marketCache = { data: data.items, fetchedAt: Date.now() };
  return marketCache.data;
};

/**
 * One NPC "works a shift": earns that job's salary into their own
 * simulated wealth field (NOT a real Veltriz Coins wallet — see Npc.js
 * model comment for why).
 */
const npcWork = async (npc, jobs) => {
  const job = jobs.find((j) => j.key === npc.jobKey);
  if (!job) return;

  npc.wealth += job.baseSalary;
  npc.totalShiftsWorked += 1;
  npc.lastActionAt = new Date();
  await npc.save();
};

/**
 * One NPC "buys something": spends simulated wealth on a market item, AND
 * applies a tiny real nudge to that item's LIVE price via economy-service's
 * existing price-override endpoint. This is a deliberately simple
 * demand-pressure model — not per-unit order-book matching — but it means
 * NPC purchases have a genuine, visible effect on prices players see,
 * which is what "AI population influences the economy" actually requires.
 */
const npcPurchase = async (npc, marketItems) => {
  const affordable = marketItems.filter((i) => i.currentPrice <= npc.wealth);
  if (affordable.length === 0) return;

  const item = affordable[Math.floor(Math.random() * affordable.length)];
  npc.wealth -= item.currentPrice;
  npc.totalPurchases += 1;
  npc.lastActionAt = new Date();
  await npc.save();

  const maxNudge = parseFloat(process.env.NPC_MAX_PRICE_NUDGE_PERCENT) || 0.4;
  const nudgePercent = (Math.random() * maxNudge) / 100; // small upward pressure from demand
  const newPrice = Math.round(item.currentPrice * (1 + nudgePercent) * 100) / 100;

  await economyInternal
    .post('/api/internal/market-items/adjust-price', { itemKey: item.key, newPrice })
    .catch((err) => logger.error('[npc-engine] Price nudge failed:', err.message));
};

const tick = async () => {
  try {
    const workProbability = parseFloat(process.env.NPC_WORK_PROBABILITY) || 0.4;
    const purchaseProbability = parseFloat(process.env.NPC_PURCHASE_PROBABILITY) || 0.15;

    const [npcs, jobs, marketItems] = await Promise.all([Npc.find(), getJobs(), getMarketItems()]);

    for (const npc of npcs) {
      if (Math.random() < workProbability) {
        await npcWork(npc, jobs);
      }
      // Higher spendingHabit personality trait = more likely to buy this tick
      if (Math.random() < purchaseProbability * (0.5 + npc.personality.spendingHabit)) {
        await npcPurchase(npc, marketItems);
      }
    }
  } catch (err) {
    logger.error('[npc-engine] Tick failed:', err.message);
  }
};

const startNpcEngine = () => {
  const intervalMs = parseInt(process.env.NPC_TICK_INTERVAL_MS, 10) || 120000;
  setInterval(tick, intervalMs);
  logger.info(`[npc-engine] Started, ticking every ${intervalMs}ms`);
};

module.exports = { startNpcEngine, tick };
