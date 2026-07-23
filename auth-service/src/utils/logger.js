/**
 * Minimal structured logger. Swap this out for winston/pino later if needed —
 * kept dependency-free on purpose for the MVP.
 */
const timestamp = () => new Date().toISOString();

const logger = {
  info: (...args) => console.log(`[INFO ${timestamp()}]`, ...args),
  warn: (...args) => console.warn(`[WARN ${timestamp()}]`, ...args),
  error: (...args) => console.error(`[ERROR ${timestamp()}]`, ...args),
};

module.exports = logger;
