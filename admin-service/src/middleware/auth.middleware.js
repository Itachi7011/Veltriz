const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET, { algorithms: ['HS256'] });

    const admin = await AdminUser.findById(decoded.sub);
    if (!admin || admin.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Admin account not active' });
    }

    req.admin = { id: admin._id.toString(), username: admin.username, role: admin.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Restricts a route to superadmins only (e.g. managing other admin accounts later)
const requireSuperAdmin = (req, res, next) => {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Superadmin privileges required' });
  }
  next();
};

module.exports = { protect, requireSuperAdmin };
