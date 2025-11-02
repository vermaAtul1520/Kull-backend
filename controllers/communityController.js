const BaseController = require("../utils/baseController");
const { Community, CommunityConfiguration } = require("../models/Community");
const User = require("../models/User");
const emailService = require("../services/emailService");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

class CommunityController extends BaseController {
  constructor() {
    super(Community); // For generic CRUD on Community
  }

  // Traditional community creation
  createCommunity = async (req, res, next) => {
    try {
      const { name, description, createdBy } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: "Community name is required" });
      }

      const existing = await Community.findOne({ name });
      if (existing) {
        return res.status(409).json({ success: false, message: "Community name already exists" });
      }

      const newCommunity = await Community.create({ name, description, createdBy });
      const config = await CommunityConfiguration.findOneAndUpdate(
        { community: newCommunity._id },
        { $set: { community: newCommunity._id } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      res.status(201).json({ success: true, message: "Community created successfully", community: newCommunity });
    } catch (err) {
      next(err);
    }
  };

  // listing 
  listCommunities = async (req, res, next) => {
    try {
      return this.getAll(req, res, next); // BaseController already supports parsedQuery
    } catch (err) {
      next(err);
    }
  };

   // Get one community detail
  getCommunityById = async (req, res, next) => {
    try {
      return this.getOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Delete one community
  deleteCommunity = async (req, res, next) => {
    try {
      return this.deleteOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  updateCommunity = (req, res, next) => {
    try {
      return this.updateOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };


  // Create or update community configuration (upsert)
  createOrUpdateConfiguration = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const updateData = req.body;

      const community = await Community.findById(communityId);
      if (!community) return res.status(404).json({ success: false, message: "Community not found" });

      const config = await CommunityConfiguration.findOneAndUpdate(
        { community: communityId },
        { $set: { ...updateData, community: communityId } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!community.communityConfiguration) {
        community.communityConfiguration = config._id;
        await community.save();
      }

      res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  };

  getConfigurationByCommunityId = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const config = await CommunityConfiguration.findOne({ community: communityId })
        .populate("community", "_id name code description");

      if (!config) return res.status(404).json({ success: false, message: "Configuration not found" });

      res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  };

  deleteConfiguration = async (req, res, next) => {
    try {
      const { communityId } = req.params;

      const deleted = await CommunityConfiguration.findOneAndDelete({ community: communityId });
      if (!deleted) return res.status(404).json({ success: false, message: "No configuration found to delete" });

      await Community.findByIdAndUpdate(communityId, { $unset: { communityConfiguration: 1 } });
      res.status(200).json({ success: true, message: "Configuration deleted successfully" });
    } catch (err) {
      next(err);
    }
  };

  // Custom method for users in a community
  getUsersByCommunityId = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const { filter, sort, projection, skip, limit, page } = req.parsedQuery;
      const { user: requestingUser } = req; // from isAuthenticated middleware

      // Add community filter
      const finalFilter = { ...(filter || {}), community: communityId };

      // Build selection string - include plain text password for admin users
      let selectFields = projection || "";
      if (requestingUser.role === "superadmin" || requestingUser.roleInCommunity === "admin") {
        selectFields += " +plainTextPassword"; // Include plain text password field for admins
      }

      // Fetch users
      const users = await User.find(finalFilter)
        .select(selectFields)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(finalFilter);

      // Convert to plain objects for response
      const usersData = users.map(user => {
        const userObj = user.toObject();
        // Rename plainTextPassword to password for cleaner API response
        if (userObj.plainTextPassword) {
          userObj.password = userObj.plainTextPassword;
          delete userObj.plainTextPassword;
        }
        return userObj;
      });

      res.status(200).json({
        success: true,
        total,
        page,
        limit,
        count: usersData.length,
        data: usersData
      });
    } catch (err) {
      next(err);
    }
  };

  getOfficerForCommunity = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const users = await User.find({
        community:communityId,
        positionInCommunity: { $exists: true, $ne: null, $ne: "" },
      });

      res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }

  getGotraSubgotraByCommunityId = async (req, res, next) => {
    try {
      const { communityId } = req.params;

      // Find community by code (treating communityId parameter as code)
      const community = await Community.findOne({ code: communityId });

      if (!community) {
        return res.status(404).json({
          success: false,
          message: "Community not found with the provided code"
        });
      }

      // Find configuration for this community
      const config = await CommunityConfiguration.findOne({ community: community._id })
        .select("gotra");

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Configuration not found for this community"
        });
      }

      res.status(200).json({
        success: true,
        data: {
          gotra: config.gotra || []
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/users/add-by-admin - Admin/SuperAdmin creates a new user with all details
  addUserByAdmin = async (req, res, next) => {
    try {
      const { user: adminUser } = req; // from isAuthenticated middleware
      const userData = req.body;

      // Authorization check - only superadmin or community admin can add users
      if (adminUser.role !== "superadmin" && adminUser.roleInCommunity !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only superadmin or community admin can add users"
        });
      }

      // Validate required fields
      if (!userData.firstName || !userData.lastName) {
        return res.status(400).json({
          success: false,
          message: "First name and last name are required"
        });
      }

      if (!userData.email && !userData.phone) {
        return res.status(400).json({
          success: false,
          message: "Either email or phone is required"
        });
      }

      if (!userData.password) {
        return res.status(400).json({
          success: false,
          message: "Password is required"
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { phone: userData.phone }
        ]
      });

      console.log('existingUser: ', existingUser);

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User with this email or phone already exists"
        });
      }

      // Use password from payload and encrypt it for admin viewing
      const plainPassword = userData.password;
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // Get community information
      let community = null;
      let communityId = null;

      // For superadmin: use communityId from URL parameter
      if (adminUser.role === "superadmin") {
        communityId = req.params.communityId;
        community = await Community.findById(communityId);

        if (!community) {
          return res.status(404).json({
            success: false,
            message: "Community not found"
          });
        }
      }
      // For community admin: use their assigned community
      else if (adminUser.roleInCommunity === "admin" && adminUser.community) {
        communityId = adminUser.community;
        community = await Community.findById(communityId);
      }

      // Ensure community is assigned
      if (!communityId) {
        return res.status(400).json({
          success: false,
          message: "Community assignment is required. Please specify a valid community."
        });
      }



      // Create new user
      const newUser = await User.create({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email || undefined,
        phone: userData.phone || undefined,
        password: hashedPassword,
        plainTextPassword: plainPassword, // Store plain text for admin viewing
        cGotNo: userData.cGotNo || undefined,
        address: userData.address || undefined,
        roleInCommunity: userData.roleInCommunity || "member",
        communityStatus: userData.communityStatus || "approved",
        positionInCommunity: userData.positionInCommunity || "member",
        occupation: userData.occupation || undefined,
        gender: userData.gender || undefined,
        religion: userData.religion || undefined,
        motherTongue: userData.motherTongue || undefined,
        interests: userData.interests || [],
        cast: userData.cast || undefined,
        fatherName: userData.fatherName || undefined,
        pinCode: userData.pinCode || undefined,
        alternativePhone: userData.alternativePhone || undefined,
        maritalStatus: userData.maritalStatus || undefined,
        gotra: userData.gotra || undefined,
        subGotra: userData.subGotra || undefined,
        profileImage: userData.profileImage || undefined,
        community: communityId || undefined,
        status: true, // Active by default
        role: "user" // Regular user role
      });

      // Send welcome email with credentials
      if (newUser.email || newUser.phone) {
        try {
          if (community) {
            // Send email with community details and credentials
            await emailService.sendCommunityAssignmentEmail(
              newUser.email || newUser.phone,
              newUser.firstName,
              community.name,
              newUser.email || newUser.phone,
              plainPassword
            );
          } else {
            // Send generic welcome email with credentials if no community
            await emailService.sendEmail(
              newUser.email || newUser.phone,
              'Welcome to KULL Platform - Your Account Details',
              `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #28a745;">Welcome to KULL Platform!</h2>
                  <p>Hello ${newUser.firstName},</p>
                  <p>Your account has been created by the administrator. Below are your login credentials:</p>

                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">🔐 Your Login Credentials</h3>
                    <p><strong>Email/Phone:</strong> ${newUser.email || newUser.phone}</p>
                    <p><strong>Password:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 4px; color: #28a745; font-weight: bold;">${plainPassword}</code></p>
                  </div>

                  <p>Open the mobile app and use these credentials to log in.</p>

                  <p>If you have any questions or need assistance, please contact our support team.</p>

                  <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
                  <p style="color: #888; font-size: 14px; text-align: center;">© ${new Date().getFullYear()} KULL Platform. All rights reserved.</p>
                </div>
              `
            );
          }
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Continue even if email fails
        }
      }

      // Remove password from response
      const userResponse = newUser.toObject();
      delete userResponse.password;

      return res.status(201).json({
        success: true,
        message: "User created successfully. Welcome email sent with login credentials.",
        user: userResponse,
        credentials: {
          loginIdentifier: newUser.email || newUser.phone,
          password: plainPassword
        }
      });

    } catch (err) {
      if (err.code === 11000) {
        // Handle duplicate key error
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} already exists`
        });
      }
      next(err);
    }
  };
}
// Export a single instance
module.exports = new CommunityController();


