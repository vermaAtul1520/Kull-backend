const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Community = require('../models/Community');

// Basic authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('communities.community', 'name joinKey status');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired. Please login again.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error in authentication.' 
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. Please login first.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

// Super admin authorization
const superAdminAuth = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Super admin privileges required.' 
    });
  }
  next();
};

// Community membership verification
const communityMemberAuth = async (req, res, next) => {
  try {
    const communityId = req.params.communityId || req.body.communityId;
    
    if (!communityId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Community ID is required.' 
      });
    }

    // Super admin has access to all communities
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Check if user is member of the community
    const isMember = req.user.isMemberOfCommunity(communityId);
    
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You are not a member of this community.' 
      });
    }

    next();
  } catch (error) {
    console.error('Community member auth error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error in community authorization.' 
    });
  }
};

// Community admin authorization
const communityAdminAuth = async (req, res, next) => {
  try {
    const communityId = req.params.communityId || req.body.communityId;
    
    if (!communityId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Community ID is required.' 
      });
    }

    // Super admin has access to all communities
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Check if user is admin of the community
    const isAdmin = req.user.isAdminOfCommunity(communityId);
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Community admin privileges required.' 
      });
    }

    next();
  } catch (error) {
    console.error('Community admin auth error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error in community admin authorization.' 
    });
  }
};

// Validate community access and attach community data
const validateCommunityAccess = async (req, res, next) => {
  try {
    const communityId = req.params.communityId || req.body.communityId;
    
    if (!communityId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Community ID is required.' 
      });
    }

    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({ 
        success: false, 
        message: 'Community not found.' 
      });
    }

    if (community.status !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        message: 'Community is not approved yet.' 
      });
    }

    if (!community.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Community is currently inactive.' 
      });
    }

    // Attach community to request for use in controllers
    req.community = community;
    next();
  } catch (error) {
    console.error('Validate community access error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error in community validation.' 
    });
  }
};

// Optional authentication (for public routes that might need user context)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .select('-password')
        .populate('communities.community', 'name joinKey status');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Don't fail for optional auth, just continue without user
    next();
  }
};

// Rate limiting for specific routes
const createRateLimit = (maxRequests, windowMinutes, message) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: {
      success: false,
      message: message || `Too many requests, please try again after ${windowMinutes} minutes.`
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Specific rate limits for auth routes
const authRateLimit = createRateLimit(5, 15, 'Too many authentication attempts, please try again after 15 minutes.');
const passwordResetLimit = createRateLimit(3, 60, 'Too many password reset attempts, please try again after 1 hour.');

module.exports = {
  auth,
  authorize,
  superAdminAuth,
  communityMemberAuth,
  communityAdminAuth,
  validateCommunityAccess,
  optionalAuth,
  authRateLimit,
  passwordResetLimit
};