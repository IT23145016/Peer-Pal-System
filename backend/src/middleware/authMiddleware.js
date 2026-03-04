const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("name email role isActive isBatchTop isTalented");
    if (!user) {
      return res.status(401).json({ message: "User does not exist" });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    req.user = {
      userId: decoded.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isBatchTop: !!user.isBatchTop,
      isTalented: !!user.isTalented,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const authorizeRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }
  next();
};

module.exports = { auth, authorizeRole };
