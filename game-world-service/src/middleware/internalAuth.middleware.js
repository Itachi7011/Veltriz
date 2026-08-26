/**
 * Guards /api/internal/* routes. Called by economy-service (to apply
 * consumable item effects to a character's stats) using a shared secret
 * header rather than a user JWT, since these calls come from another
 * backend service, not from a player's browser.
 *
 * Caller must send: X-Internal-Api-Key: <INTERNAL_API_KEY>
 */
const internalAuth = (req, res, next) => {
  const key = req.headers['x-internal-api-key'];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden: invalid internal service key' });
  }
  next();
};

module.exports = internalAuth;
