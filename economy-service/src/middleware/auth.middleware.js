const jwt = require('jsonwebtoken');

/**
 * Stateless JWT verification — same shared JWT_SECRET as auth-service.
 * This service does NOT call auth-service to check tokens; it trusts the
 * signature. We don't even need a local User model here — economy-service
 * only needs the userId (req.user.id) to scope wallets/jobs/inventory.
 */
const protect = (req, res, next) => {

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
console.log("=== ECONOMY AUTH ===");
console.log("Authorization:", req.headers.authorization);

const token = authHeader.split(" ")[1];
console.log("Token:", token);

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
  });

  console.log("Decoded:", decoded);

  req.user = {
    id: decoded.sub,
    username: decoded.username,
    role: decoded.role,
  };

  next();
} catch (err) {
  console.log("JWT ERROR:", err.name);
  console.log("JWT MESSAGE:", err.message);

  return res.status(401).json({
    success: false,
    message: "Invalid token",
  });
}
};

module.exports = { protect };
