// controllers/authController.js
// Authentication controller using service layer

const { getAuthService } = require('../services/authService');
const { getDashboardService } = require('../services/dashboardService');

const authService = getAuthService();
const dashboardService = getDashboardService();

exports.signupUser = async (req, res, next) => {
  try {
    const { referral, ...userData } = req.body;
    const result = await authService.signup(userData, referral);

    return res.status(201).json({
      success: true,
      message: result.message,
      user: result.user,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    const result = await authService.login(emailOrPhone, password);

    return res.status(200).json({
      message: 'Login successful.',
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

exports.getAdminDashboardStats = async (req, res) => {
  try {
    const data = await dashboardService.getAdminDashboardStats();
    return res.status(200).json({ success: true, data });
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

    if (user.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Superadmin should use /admin/dashboard-stats endpoint.',
      });
    }

    if (!user.community || user.roleInCommunity !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only community admin can access.',
      });
    }

    const communityId = user.community._id || user.community;
    const data = await dashboardService.getCommunityDashboardStats(communityId);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Community admin dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching community dashboard statistics.',
      error: error.message,
    });
  }
};