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

    // Optional but recommended: fetch fresh user data from DB
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token user not found" 
      });
    }

    // Attach user info to req for access in controller
    req.user = {
      id: user._id,
      role: user.role,
      roleInCommunity:user.roleInCommunity,
      community: user.community,
      // You can add more fields here as needed
    };

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
