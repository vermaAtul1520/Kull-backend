const User = require('../models/User');
const emailService = require('../services/emailService');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const {Community} = require('../models/Community');
const Appeal = require('../models/Appeal');
const Post = require('../models/Post');
const News = require('../models/News');
const JobPost = require('../models/JobPost');
const Meeting = require('../models/Meeting');
const SportsEvent = require('../models/SportsEvent');
const Donation = require('../models/Donation');
const Dukaan = require('../models/Dukaan');
const EducationResource = require('../models/EducationResource');
const Kartavya = require('../models/Kartavya');
const {Occasion} = require('../models/Occasion');
const mongoose = require('mongoose');
const os = require('os');

exports.signupUser = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      referral,
      gender,
      occupation,
      religion,
      motherTongue,
      interests,
      cast,
      cGotNo,
      fatherName,
      address,
      pinCode,
      alternativePhone,
      estimatedMembers,
      thoughtOfMaking,
      maritalStatus,
      gotra,
      subGotra,
      profileImage,
    } = req.body;

    // Validate email/phone
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Either email or phone is required",
      });
    }

    // Validate password
    if (!password || password.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Password is required and should be at least 3 characters long",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (auto-approve if referral code is provided)
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      gender,
      occupation,
      religion,
      motherTongue,
      interests,
      cast,
      cGotNo,
      fatherName,
      address,
      pinCode,
      alternativePhone,
      estimatedMembers,
      thoughtOfMaking,
      maritalStatus,
      gotra,
      subGotra,
      profileImage,
      communityStatus: referral ? "approved" : "pending", // auto-approve if referral provided
    });

    // -------- CASE 1: User came with referral code --------------
    if (referral) {
      const community = await Community.findOne({ code: referral });

      if (!community) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }

      // Find community admin
      const communityAdmin = await User.findOne({
        community: community._id,
        roleInCommunity: "admin",
      });

      // Assign community and set roleInCommunity to "member"
      newUser.community = community._id;
      newUser.roleInCommunity = "member"; // Ensure role is set
      await newUser.save(); 

      // Send welcome email to new user
      try {
        await emailService.sendWelcomeEmail(
          newUser.email || newUser.phone,
          newUser.firstName
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      // Notify community admin
      if (communityAdmin && communityAdmin.email) {
        try {
          await emailService.sendJoinRequestNotificationToAdmin(
            communityAdmin.email,
            communityAdmin.firstName,
            `${newUser.firstName} ${newUser.lastName}`,
            community.name
          );
        } catch (emailError) {
          console.error('Failed to send admin notification:', emailError);
        }
      }
    }

    // -------- CASE 2: No referral — notify SUPER ADMIN --------------
    if (!referral && process.env.SUPER_ADMIN_EMAIL) {
      try {
        // Send custom email to super admin about pending user
        await emailService.sendEmail(
          process.env.SUPER_ADMIN_EMAIL,
          'New User Signup Pending Approval',
          `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #333;">New User Registration - Pending Approval</h2>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Name:</strong> ${newUser.firstName} ${newUser.lastName}</p>
                <p><strong>Email:</strong> ${newUser.email || "N/A"}</p>
                <p><strong>Phone:</strong> ${newUser.phone || "N/A"}</p>
                <p><strong>User Code:</strong> ${newUser.code}</p>
                <p style="color: #ff9800;"><strong>Status:</strong> Pending - No Referral Provided</p>
              </div>
              <p>Please review and approve this user from the admin panel.</p>
            </div>
          `
        );
      } catch (emailError) {
        console.error('Failed to send super admin notification:', emailError);
      }
    }

    // -------- Return success --------
    return res.status(201).json({
      success: true,
      message: referral
        ? "Signup successful. You have been automatically approved and added to the community."
        : "Signup successful. Super admin has been notified.",
      user: {
        id: newUser._id,
        code: newUser.code,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        communityStatus: newUser.communityStatus,
      },
    });

  } catch (err) {
    next(err);
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    // Validate input
    if (!emailOrPhone || !password) {
      return res.status(400).json({ message: 'Email or phone and password are required.' });
    }

    // Find user by email or phone, explicitly selecting password
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    }).select('+password').populate('community', '_id name');

    // If no user found
    if (!user) {
      return res.status(401).json({ message: 'Invalid user.' });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // If user is not superadmin, they must belong to an approved community
    if (
      user.role !== 'superadmin' &&
      (!user.community || user.communityStatus !== 'approved')
    ) {
      return res.status(403).json({
        message: 'You must belong to an approved community to login.',
      });
    }

    // Prepare JWT payload
    const payload = {
      id: user._id,
      role: user.role,
      email: user.email,
      phone: user.phone,
      community: user.community,
      roleInCommunity: user.roleInCommunity,
    };

    // Generate token
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'default-secret', {
      expiresIn: '7d',
    });

    // Remove password before sending response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Send success response
    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Server error.',
      error: error.message,
    });
  }
};

exports.getAdminDashboardStats = async (req, res) => {
  try {
    // System Health Check
    const startTime = Date.now();

    // Check database connection
    const dbConnectionState = mongoose.connection.readyState;
    const dbStatus = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };

    // System metrics
    const systemHealth = {
      serverStatus: 'Online',
      database: {
        status: dbStatus[dbConnectionState] || 'Unknown',
        connected: dbConnectionState === 1,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      apiStatus: 'Operational',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        systemTotal: Math.round(os.totalmem() / 1024 / 1024),
        systemFree: Math.round(os.freemem() / 1024 / 1024)
      },
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      platform: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname()
      }
    };

    const [
      totalUsers,
      totalCommunities,
      pendingUsers,
      approvedUsers,
      rejectedUsers,
      totalPosts,
      totalAppeals,
      pendingAppeals,
      totalNews,
      totalJobPosts,
      totalMeetings,
      totalSportsEvents,
      totalDonations,
      totalDukaans,
      totalEducationResources,
      totalKartavya,
      totalOccasions,
      recentUsers,
      recentCommunities
    ] = await Promise.all([
      User.countDocuments(),
      Community.countDocuments(),
      User.countDocuments({ communityStatus: 'pending' }),
      User.countDocuments({ communityStatus: 'approved' }),
      User.countDocuments({ communityStatus: 'rejected' }),
      Post.countDocuments(),
      Appeal.countDocuments(),
      Appeal.countDocuments({ status: 'submitted' }),
      News.countDocuments(),
      JobPost.countDocuments(),
      Meeting.countDocuments(),
      SportsEvent.countDocuments(),
      Donation.countDocuments(),
      Dukaan.countDocuments(),
      EducationResource.countDocuments(),
      Kartavya.countDocuments(),
      Occasion.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email phone communityStatus createdAt'),
      Community.find().sort({ createdAt: -1 }).limit(5).select('name code createdAt')
    ]);

    const userStatusBreakdown = {
      pending: pendingUsers,
      approved: approvedUsers,
      rejected: rejectedUsers
    };

    const roleBreakdown = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const communityUsersBreakdown = await User.aggregate([
      { $match: { community: { $exists: true, $ne: null } } },
      { $group: { _id: '$roleInCommunity', count: { $sum: 1 } } }
    ]);

    const monthlyUserGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Calculate response time
    const responseTime = Date.now() - startTime;
    systemHealth.responseTime = `${responseTime}ms`;

    return res.status(200).json({
      success: true,
      data: {
        systemHealth,
        overview: {
          totalUsers,
          totalCommunities,
          pendingUsers,
          approvedUsers,
          rejectedUsers
        },
        userStats: {
          total: totalUsers,
          statusBreakdown: userStatusBreakdown,
          roleBreakdown: roleBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          communityRoleBreakdown: communityUsersBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          monthlyGrowth: monthlyUserGrowth
        },
        contentStats: {
          totalPosts,
          totalNews,
          totalJobPosts,
          totalMeetings,
          totalSportsEvents,
          totalDukaans,
          totalEducationResources,
          totalKartavya,
          totalOccasions,
          totalDonations
        },
        appealStats: {
          total: totalAppeals,
          pending: pendingAppeals,
          resolved: totalAppeals - pendingAppeals
        },
        recentActivity: {
          recentUsers,
          recentCommunities
        }
      }
    });

  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics.',
      error: error.message,
    });
  }
};

exports.getCommunityAdminDashboardStats = async (req, res) => {
  try {
    const { user } = req;

    // If superadmin, they can see all stats (redirect to main dashboard)
    if (user.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Superadmin should use /admin/dashboard-stats endpoint for system-wide stats.'
      });
    }

    // Ensure user is a community admin and has a community
    if (!user.community || user.roleInCommunity !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only community admin can access community stats.'
      });
    }

    const communityId = user.community;
    const startTime = Date.now();

    // Check database connection
    const dbConnectionState = mongoose.connection.readyState;
    const dbStatus = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };

    // System metrics (simplified for community admin)
    const systemHealth = {
      serverStatus: 'Online',
      database: {
        status: dbStatus[dbConnectionState] || 'Unknown',
        connected: dbConnectionState === 1
      },
      apiStatus: 'Operational',
      timestamp: new Date().toISOString()
    };

    // Get community-specific stats
    const [
      totalCommunityUsers,
      pendingCommunityUsers,
      approvedCommunityUsers,
      rejectedCommunityUsers,
      totalCommunityPosts,
      totalCommunityAppeals,
      pendingCommunityAppeals,
      totalCommunityNews,
      totalCommunityJobPosts,
      totalCommunityMeetings,
      totalCommunitySportsEvents,
      totalCommunityDonations,
      totalCommunityDukaans,
      totalCommunityEducationResources,
      totalCommunityKartavya,
      totalCommunityOccasions,
      recentCommunityUsers,
      communityInfo
    ] = await Promise.all([
      User.countDocuments({ community: communityId }),
      User.countDocuments({ community: communityId, communityStatus: 'pending' }),
      User.countDocuments({ community: communityId, communityStatus: 'approved' }),
      User.countDocuments({ community: communityId, communityStatus: 'rejected' }),
      Post.countDocuments({ community: communityId }),
      Appeal.countDocuments({ community: communityId }),
      Appeal.countDocuments({ community: communityId, status: 'submitted' }),
      News.countDocuments({ community: communityId }),
      JobPost.countDocuments({ community: communityId }),
      Meeting.countDocuments({ community: communityId }),
      SportsEvent.countDocuments({ community: communityId }),
      Donation.countDocuments({ community: communityId }),
      Dukaan.countDocuments({ community: communityId }),
      EducationResource.countDocuments({ community: communityId }),
      Kartavya.countDocuments({ community: communityId }),
      Occasion.countDocuments({ community: communityId }),
      User.find({ community: communityId }).sort({ createdAt: -1 }).limit(5).select('firstName lastName email phone communityStatus createdAt'),
      Community.findById(communityId).select('name code createdAt')
    ]);

    const userStatusBreakdown = {
      pending: pendingCommunityUsers,
      approved: approvedCommunityUsers,
      rejected: rejectedCommunityUsers
    };

    // Role breakdown within the community
    const roleBreakdown = await User.aggregate([
      { $match: { community: new mongoose.Types.ObjectId(communityId) } },
      { $group: { _id: '$roleInCommunity', count: { $sum: 1 } } }
    ]);

    // Monthly user growth for the community
    const monthlyUserGrowth = await User.aggregate([
      { $match: { community: new mongoose.Types.ObjectId(communityId) } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Calculate response time
    const responseTime = Date.now() - startTime;
    systemHealth.responseTime = `${responseTime}ms`;

    return res.status(200).json({
      success: true,
      data: {
        communityInfo,
        systemHealth,
        overview: {
          totalUsers: totalCommunityUsers,
          pendingUsers: pendingCommunityUsers,
          approvedUsers: approvedCommunityUsers,
          rejectedUsers: rejectedCommunityUsers
        },
        userStats: {
          total: totalCommunityUsers,
          statusBreakdown: userStatusBreakdown,
          roleBreakdown: roleBreakdown.reduce((acc, item) => {
            acc[item._id || 'undefined'] = item.count;
            return acc;
          }, {}),
          monthlyGrowth: monthlyUserGrowth
        },
        contentStats: {
          totalPosts: totalCommunityPosts,
          totalNews: totalCommunityNews,
          totalJobPosts: totalCommunityJobPosts,
          totalMeetings: totalCommunityMeetings,
          totalSportsEvents: totalCommunitySportsEvents,
          totalDukaans: totalCommunityDukaans,
          totalEducationResources: totalCommunityEducationResources,
          totalKartavya: totalCommunityKartavya,
          totalOccasions: totalCommunityOccasions,
          totalDonations: totalCommunityDonations
        },
        appealStats: {
          total: totalCommunityAppeals,
          pending: pendingCommunityAppeals,
          resolved: totalCommunityAppeals - pendingCommunityAppeals
        },
        recentActivity: {
          recentUsers: recentCommunityUsers
        }
      }
    });

  } catch (error) {
    console.error('Community admin dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching community dashboard statistics.',
      error: error.message,
    });
  }
};