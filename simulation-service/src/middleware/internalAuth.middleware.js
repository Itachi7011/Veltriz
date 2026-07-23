const internalAuth = (req, res, next) => {
  const key = req.headers['x-internal-api-key'];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden: invalid internal service key' });
  }
  next();
};

module.exports = internalAuth;
