const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Community = require('../models/Community');
const emailService = require('../services/emailService');
const { cleanupFiles } = require('../middleware/upload');

// Generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  
  return { accessToken, refreshToken };
};

// Standard user registration (deprecated in favor of join-community)
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone number'
      });
    }

    // Create user
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: 'user'
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.firstName);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          communities: user.communities
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// User login with email/phone and password
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { emailOrPhone, password } = req.body;

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    }).select('+password').populate('communities.community', 'name joinKey status');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          communities: user.communities.filter(c => c.status === 'approved'),
          lastLogin: user.lastLogin
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Join community with unique key and user details
const joinCommunity = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { joinKey, firstName, lastName, email, phone, password } = req.body;

    // Find community by join key
    const community = await Community.findByJoinKey(joinKey);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Invalid join key or community not found'
      });
    }

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (user) {
      // Check if user is already in this community
      const existingCommunity = user.communities.find(
        c => c.community.toString() === community._id.toString()
      );

      if (existingCommunity) {
        return res.status(400).json({
          success: false,
          message: `You have already ${existingCommunity.status === 'approved' ? 'joined' : 'requested to join'} this community`
        });
      }

      // Add community to existing user
      user.communities.push({
        community: community._id,
        role: 'member',
        status: community.settings.requireApproval ? 'pending' : 'approved'
      });
    } else {
      // Create new user
      user = new User({
        firstName,
        lastName,
        email,
        phone,
        password,
        role: 'user',
        communities: [{
          community: community._id,
          role: 'member',
          status: community.settings.requireApproval ? 'pending' : 'approved'
        }]
      });
    }

    await user.save();

    // Update community member count if approved
    if (!community.settings.requireApproval) {
      await community.updateMemberCount();
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Send appropriate email
    if (community.settings.requireApproval) {
      await emailService.sendJoinRequestEmail(user.email, user.firstName, community.name);
      // Notify community admin
      const admin = await User.findById(community.admin);
      if (admin) {
        await emailService.sendJoinRequestNotificationToAdmin(admin.email, admin.firstName, user.fullName, community.name);
      }
    } else {
      await emailService.sendWelcomeToCommunityEmail(user.email, user.firstName, community.name);
    }

    res.status(201).json({
      success: true,
      message: community.settings.requireApproval 
        ? 'Join request submitted successfully. Waiting for admin approval.'
        : 'Successfully joined the community!',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          communities: user.communities
        },
        community: {
          id: community._id,
          name: community.name,
          status: community.settings.requireApproval ? 'pending' : 'approved'
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Join community error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during community join'
    });
  }
};

// Request new community registration
const requestCommunity = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded files if validation fails
      cleanupFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      communityName,
      description,
      category,
      contactEmail,
      contactPhone,
      website,
      address,
      city,
      state,
      country,
      zipCode,
      firstName,
      lastName,
      email,
      phone,
      password
    } = req.body;

    // Check if community name already exists
    const existingCommunity = await Community.findOne({ name: communityName });
    if (existingCommunity) {
      cleanupFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'Community with this name already exists'
      });
    }

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (!user) {
      // Create new user who will be the admin
      user = new User({
        firstName,
        lastName,
        email,
        phone,
        password,
        role: 'user' // Will be updated to have admin role for this community
      });
      await user.save();
    }

    // Process uploaded files
    const documents = [];
    let logoPath = null;

    if (req.files) {
      if (req.files.documents) {
        req.files.documents.forEach(file => {
          documents.push({
            fileName: file.originalname,
            filePath: file.path,
            fileType: file.mimetype,
            fileSize: file.size
          });
        });
      }

      if (req.files.logo && req.files.logo[0]) {
        logoPath = req.files.logo[0].path;
      }
    }

    // Create community request
    const community = new Community({
      name: communityName,
      description,
      category,
      location: {
        address,
        city,
        state,
        country,
        zipCode
      },
      contactInfo: {
        email: contactEmail,
        phone: contactPhone,
        website: website || undefined
      },
      admin: user._id,
      documents,
      logo: logoPath,
      status: 'pending'
    });

    await community.save();

    // Send confirmation email to requester
    await emailService.sendCommunityRequestConfirmation(user.email, user.firstName, communityName);

    // Notify super admins about new community request
    const superAdmins = await User.find({ role: 'superadmin' });
    for (const admin of superAdmins) {
      await emailService.sendCommunityRequestNotificationToSuperAdmin(
        admin.email,
        admin.firstName,
        communityName,
        user.fullName
      );
    }

    res.status(201).json({
      success: true,
      message: 'Community registration request submitted successfully. You will be notified once reviewed.',
      data: {
        requestId: community._id,
        communityName: community.name,
        status: community.status,
        submittedBy: {
          name: user.fullName,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Community request error:', error);
    // Clean up uploaded files on error
    cleanupFiles(req.files);
    res.status(500).json({
      success: false,
      message: 'Server error during community request submission'
    });
  }
};

// Request password reset
const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { emailOrPhone } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email/phone exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = user.generateResetPasswordToken();
    await user.save();

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);

    res.json({
      success: true,
      message: 'Password reset link has been sent to your email.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    await emailService.sendPasswordResetConfirmation(user.email, user.firstName);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('communities.community', 'name description joinKey status category')
      .select('-password');

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          communities: user.communities.filter(c => c.status === 'approved'),
          pendingCommunities: user.communities.filter(c => c.status === 'pending'),
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user profile'
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    // In a more advanced implementation, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// Refresh JWT token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Get community info by join key (public endpoint)
const getCommunityByJoinKey = async (req, res) => {
  try {
    const { joinKey } = req.params;

    const community = await Community.findByJoinKey(joinKey)
      .populate('admin', 'firstName lastName email')
      .select('name description category location contactInfo stats');

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found with this join key'
      });
    }

    res.json({
      success: true,
      data: {
        community: {
          name: community.name,
          description: community.description,
          category: community.category,
          location: community.fullAddress,
          contactEmail: community.contactInfo.email,
          memberCount: community.stats.totalMembers,
          admin: community.admin.firstName + ' ' + community.admin.lastName
        }
      }
    });
  } catch (error) {
    console.error('Get community by join key error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching community information'
    });
  }
};

// Validate community join key
const validateJoinKey = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { joinKey } = req.body;

    const community = await Community.findByJoinKey(joinKey);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Invalid join key'
      });
    }

    res.json({
      success: true,
      message: 'Valid join key',
      data: {
        communityName: community.name,
        requiresApproval: community.settings.requireApproval
      }
    });
  } catch (error) {
    console.error('Validate join key error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error validating join key'
    });
  }
};

// Email verification (placeholder - implement based on your email service)
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Implementation depends on your email verification strategy
    res.json({
      success: true,
      message: 'Email verification feature coming soon'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
};

// Resend email verification
const resendEmailVerification = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Email verification resend feature coming soon'
    });
  } catch (error) {
    console.error('Resend email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resending email verification'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  joinCommunity,
  requestCommunity,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  refreshToken,
  getCommunityByJoinKey,
  validateJoinKey,
  verifyEmail,
  resendEmailVerification
};