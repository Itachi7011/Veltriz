/**
 * Guards /api/internal/* routes. Only admin-service should ever call these
 * (price overrides, wallet credit/debit, economy stats). It authenticates
 * via a shared secret header rather than a user JWT, since these calls
 * come from admin-service's backend, not from an admin's browser directly.
 *
 * admin-service must send: X-Internal-Api-Key: <INTERNAL_API_KEY>
 */
const internalAuth = (req, res, next) => {
  const key = req.headers['x-internal-api-key'];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden: invalid internal service key' });
  }
  next();
};

module.exports = internalAuth;
