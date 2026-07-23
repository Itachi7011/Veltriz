const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies the Access Token sent as: Authorization: Bearer <token>
 *
 * IMPORTANT (multi-service note): economy-service and game-world-service
 * should use this exact same verification logic with the SAME JWT_SECRET
 * env var, so a single login works across all Veltriz services without
 * each one needing its own session store. They don't need to hit this
 * service to validate a token — jwt.verify() is stateless and local.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    const user = await User.findById(decoded.sub);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account not active' });
    }

    req.user = { id: user._id.toString(), username: user.username, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { protect };
