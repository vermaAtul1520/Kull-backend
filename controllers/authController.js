const User = require('../models/User');
const sendEmail = require('../utils/sendEmail'); // Utility to send email
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const jwt = require('jsonwebtoken');

exports.signupUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Either email or phone is required"
      });
    }

    if (!password || password.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Password is required and should be at least 6 characters long"
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,  // hashed password
      communityStatus: "pending",
    });

    // Send email to Super Admin (optional)
    await sendEmail({
      to: process.env.SUPER_ADMIN_EMAIL,
      subject: "New User Signup Request - Approval Needed",
      html: `
        <h2>New User Requested to Join Kull</h2>
        <p><strong>Name:</strong> ${newUser.firstName} ${newUser.lastName}</p>
        <p><strong>Email:</strong> ${newUser.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${newUser.phone || 'N/A'}</p>
        <p><strong>User Code:</strong> ${newUser.code}</p>
        <p><strong>Status:</strong> Pending Approval</p>
      `
    });

    return res.status(201).json({
      success: true,
      message: "Signup successful. Admin will assign your community soon.",
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
    }).select('+password');

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