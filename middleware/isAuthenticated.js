// middleware/isAuthenticated.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to protect routes by verifying JWT token and fetching user from DB
const isAuthenticated = async (req, res, next) => {
  // Extract token from Authorization header: "Bearer <token>"
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: "No token provided" 
    });
  }

  try {
    // Decode and verify token using secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

    // Use JWT payload directly instead of DB query for better performance
    // Only query DB for critical operations that need fresh data
    req.user = {
      id: decoded.id,
      role: decoded.role,
      roleInCommunity: decoded.roleInCommunity,
      community: decoded.community,
    };
    
    // Add convenience booleans
    req.user.isSuperAdmin = decoded.role === "superadmin";
    req.user.isCommunityAdmin =
      decoded.roleInCommunity === "admin" &&
      decoded.community;

    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false,
      message: "Invalid or expired token",
      error: err.message
    });
  }
};

module.exports = isAuthenticated;
