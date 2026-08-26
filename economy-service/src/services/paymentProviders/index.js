const sandboxProvider = require('./sandboxProvider');

// Add real providers here as they're built, e.g.:
//   const stripeProvider = require('./stripeProvider');
//   const PROVIDERS = { sandbox: sandboxProvider, stripe: stripeProvider };
const PROVIDERS = {
  sandbox: sandboxProvider,
};

const getActiveProvider = () => {
  const key = process.env.PAYMENT_PROVIDER || 'sandbox';
  const provider = PROVIDERS[key];
  if (!provider) {
    throw new Error(`Unknown PAYMENT_PROVIDER "${key}" — falling back to sandbox would silently hide a misconfiguration, so this throws instead.`);
  }
  return provider;
};

module.exports = { getActiveProvider };
