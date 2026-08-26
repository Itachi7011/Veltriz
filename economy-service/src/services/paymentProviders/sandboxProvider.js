/**
 * THE PAYMENT PROVIDER INTERFACE
 * ===============================
 * Every provider (this sandbox one today, a real Stripe/Razorpay/etc. one
 * later) implements exactly one async method:
 *
 *   charge({ userId, amountUSD, productKey, testCardNumber }) => Promise<{
 *     success: boolean,
 *     providerRef: string,       // the gateway's charge/session id
 *     failureReason?: string,    // present only when success is false
 *   }>
 *
 * payments.controller.js only ever calls `provider.charge(...)` — it has
 * zero knowledge of HOW a charge happens. That's the entire point: going
 * live later means writing services/paymentProviders/stripeProvider.js
 * with a real charge() that calls the Stripe SDK, adding one line to
 * index.js's PROVIDERS map, and setting PAYMENT_PROVIDER=stripe in the
 * env. Nothing in models/, controllers/, or the game-client changes.
 *
 * THIS FILE — the sandbox — never contacts a real payment network and
 * never moves real money. It exists so the whole purchase → shard-credit
 * → ledger flow can be built, tested, and demoed today.
 */

// Recognizable "test card" numbers, the same trick every real sandbox
// (Stripe's 4000 0000 0000 0002, etc.) uses so a developer can deliberately
// trigger a decline while testing the failure path. Any other digits (or
// no card at all) succeed.
const DECLINE_TEST_CARDS = new Set(['4000000000000002', '4000000000009995']);

const charge = async ({ userId, amountUSD, productKey, testCardNumber }) => {
  // A tiny artificial delay so the client's "processing…" state has
  // something real to show — a genuine gateway round-trip isn't instant
  // either, and a UI that's never seen a pending state is one that breaks
  // the first time a real provider adds real latency.
  await new Promise((resolve) => setTimeout(resolve, 350));

  if (testCardNumber && DECLINE_TEST_CARDS.has(testCardNumber.replace(/\s+/g, ''))) {
    return { success: false, providerRef: null, failureReason: 'Test card declined (insufficient funds).' };
  }

  return {
    success: true,
    providerRef: `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  };
};

module.exports = { name: 'sandbox', charge };
