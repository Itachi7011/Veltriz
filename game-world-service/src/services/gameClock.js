/**
 * THE GAME CLOCK
 * ==============
 * A single, server-computed, STATELESS in-game calendar shared by every
 * player — there's nothing to store or tick in a cron job, it's pure math
 * off two constants:
 *
 *   GAME_EPOCH   — the real moment "Day 1, 00:00" happened (fixed, so the
 *                  calendar survives restarts/redeploys instead of
 *                  resetting to Day 1 every time the process boots)
 *   TIME_SCALE   — how many in-game seconds pass per real second
 *
 * Default is 60x: 1 real minute = 1 in-game hour, so a full 24-hour
 * in-game day takes 24 real minutes — a common, pleasant pace for a
 * life-sim's day/night cycle (fast enough to see night fall in one play
 * session, slow enough to feel like a "day"). Tune by changing TIME_SCALE
 * below (or wiring it to an env var) — nothing else in the game depends on
 * this exact number.
 *
 * IMPORTANT — this clock is purely cosmetic/atmospheric (day/night tint on
 * the map, a HUD readout). It is deliberately NOT what job shifts, crime
 * cooldowns, or Chrono Shard rush timers run on — those use real
 * wall-clock milliseconds directly (see jobs.controller.js's
 * pendingShift.completesAt), specifically so "wait 10 real minutes for
 * your shift" always means 10 real minutes regardless of what TIME_SCALE
 * is set to. Coupling gameplay timers to a scale factor that's likely to
 * change for pacing/balance reasons would make every cooldown silently
 * drift whenever that number changes — two separate clocks for two
 * separate purposes, on purpose.
 */

// Set to (approximately) whenever this ships to production — a fixed date
// far in the past combined with a 60x scale would make Day 1 already be
// in the tens of thousands by the time anyone plays (8 months earlier ×
// 60 = ~14,000 days), which reads as broken even though the math is
// correct. Bump this to the actual launch date before going live.
const GAME_EPOCH = new Date('2026-08-24T00:00:00.000Z').getTime();
const TIME_SCALE = 60; // 1 real second = 60 in-game seconds

const MS_PER_GAME_DAY = 24 * 60 * 60 * 1000;

const getGameClock = () => {
  const realNowMs = Date.now();
  const inGameElapsedMs = (realNowMs - GAME_EPOCH) * TIME_SCALE;

  const day = Math.floor(inGameElapsedMs / MS_PER_GAME_DAY) + 1;
  const msIntoDay = ((inGameElapsedMs % MS_PER_GAME_DAY) + MS_PER_GAME_DAY) % MS_PER_GAME_DAY;
  const hour = Math.floor(msIntoDay / (60 * 60 * 1000));
  const minute = Math.floor((msIntoDay % (60 * 60 * 1000)) / (60 * 1000));

  const isNight = hour < 6 || hour >= 20; // 8pm-6am in-game

  return {
    day,
    hour,
    minute,
    isNight,
    label: `Day ${day}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    epochMs: GAME_EPOCH,
    timeScale: TIME_SCALE,
    serverNowMs: realNowMs,
  };
};

module.exports = { getGameClock, GAME_EPOCH, TIME_SCALE };
