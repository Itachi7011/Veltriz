/**
 * Guards /api/internal/* routes. Called by admin-service (crime action CRUD,
 * heat leaderboard, heat reset) using a shared secret header rather than an
 * admin JWT, since these calls come from another backend service, not
 * directly from an admin's browser.
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
