const User = require('../models/User');
const sendEmail = require('../utils/sendEmail'); // Utility to send email
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const {Community} = require('../models/Community');

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

    // Create user (do not assign community yet)
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
      communityStatus: "pending", // always pending by default
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

      if (communityAdmin) {
        await sendEmail({
          to: communityAdmin.email,
          subject: "New User Request to Join Your Community",
          html: `
            <h2>New Signup for Your Community</h2>
            <p><strong>Name:</strong> ${newUser.firstName} ${newUser.lastName}</p>
            <p><strong>Email:</strong> ${newUser.email || "N/A"}</p>
            <p><strong>Phone:</strong> ${newUser.phone || "N/A"}</p>
            <p><strong>User Code:</strong> ${newUser.code}</p>
            <p>Status: <strong>Pending</strong></p>
          `
        });
      }
    }

    // -------- CASE 2: No referral — notify SUPER ADMIN --------------
    if (!referral) {
      await sendEmail({
        to: process.env.SUPER_ADMIN_EMAIL,
        subject: "New User Signup Request - No Referral",
        html: `
          <h2>New User Requested to Join Kull (No Referral)</h2>
          <p><strong>Name:</strong> ${newUser.firstName} ${newUser.lastName}</p>
          <p><strong>Email:</strong> ${newUser.email || "N/A"}</p>
          <p><strong>Phone:</strong> ${newUser.phone || "N/A"}</p>
          <p><strong>User Code:</strong> ${newUser.code}</p>
          <p>Status: <strong>Pending - No Referral Provided</strong></p>
        `
      });
    }

    // -------- Return success --------
    return res.status(201).json({
      success: true,
      message: referral
        ? "Signup successful. Community admin has been notified."
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