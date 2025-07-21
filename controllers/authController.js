// controllers/authController.js

const User = require('../models/User');
// const sendEmail = require('../utils/sendEmail'); // Uncomment if using

exports.signupUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    // Either email or phone is required
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Either email or phone is required"
      });
    }

    // Create user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      communityStatus: "pending", // default value
    });

    // Optional: Notify Super Admin
    /*
    await sendEmail({
      to: process.env.SUPER_ADMIN_EMAIL,
      subject: "New User Signup - Approval Needed",
      html: `
        <h2>New User Registered</h2>
        <p><strong>Name:</strong> ${newUser.firstName} ${newUser.lastName}</p>
        <p><strong>Email:</strong> ${newUser.email || 'Not Provided'}</p>
        <p><strong>Phone:</strong> ${newUser.phone || 'Not Provided'}</p>
        <p><strong>Status:</strong> Pending approval & no community assigned</p>
      `,
    });
    */

    return res.status(201).json({
      success: true,
      message: "Signup successful. Admin will assign your community soon.",
      user: {
        id: newUser._id,
        code: newUser.code, // UUID
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
