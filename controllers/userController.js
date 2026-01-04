const User = require("../models/User");
const { Community } = require("../models/Community");
const BaseController = require("../utils/baseController");
const emailService = require("../services/emailService");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");


const COMMUNITY_ADMIN_USERS_UPDATE_ALLOWED_FIELDS = ["communityStatus", "roleInCommunity", "status"];

class UserController extends BaseController {
  constructor() {
    super(User);
  }

  updateUser = async (req, res, next) => {
    try {
      const { user } = req; // from isAuthenticated
      const { userId } = req.params; // target user id
      const updateData = req.body;
      console.log("id...", userId, req.body)

      // Find target user and populate community
      const targetUser = await this.model.findById(userId).populate('community', 'name');
      if (!targetUser) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Track if communityStatus changed to 'approved'
      const wasApproved = targetUser.communityStatus !== 'approved' && updateData.communityStatus === 'approved';

      // Superadmin: full access
      if (user.role === "superadmin") {
        // Hash password if it's being updated
        if (updateData.password) {
          const plainPassword = updateData.password;
          updateData.password = await bcrypt.hash(plainPassword, 10);
          // Also update plainTextPassword for admin viewing
          updateData.plainTextPassword = plainPassword;
        }
        Object.assign(targetUser, updateData);
        await targetUser.save();

        // Send approval email if user was just approved
        if (wasApproved && targetUser.community && (targetUser.email || targetUser.phone)) {
          try {
            await emailService.sendJoinApprovalEmail(
              targetUser.email || targetUser.phone,
              targetUser.firstName,
              targetUser.community.name
            );
          } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
          }
        }

        return res.status(200).json({
          success: true,
          message: "User updated (superadmin)",
          user: targetUser,
        });
      }

      // Community admin: partial access
      if (user.roleInCommunity === "admin" && String(user.community) === String(targetUser.community)) {
        for (let key of Object.keys(updateData)) {
          if (COMMUNITY_ADMIN_USERS_UPDATE_ALLOWED_FIELDS.includes(key)) {
            targetUser[key] = updateData[key];
          }
        }
        await targetUser.save();

        // Send approval email if user was just approved by community admin
        if (wasApproved && targetUser.community && (targetUser.email || targetUser.phone)) {
          try {
            await emailService.sendJoinApprovalEmail(
              targetUser.email || targetUser.phone,
              targetUser.firstName,
              targetUser.community.name
            );
          } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
          }
        }

        return res.status(200).json({
          success: true,
          message: "User updated (community admin)",
          user: targetUser,
        });
      }

      // Not authorized
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this user",
      });
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/users/:userId/assign-community
  assignCommunityToUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const { communityId } = req.body;
      const requester = req.user; // From auth middleware (token)

      if (!communityId) {
        return res.status(400).json({ success: false, message: "Community ID is required" });
      }

      // Get the target user and community
      const userToUpdate = await User.findById(userId);
      const community = await Community.findById(communityId);

      if (!userToUpdate || !community) {
        return res.status(404).json({ success: false, message: "User or Community not found" });
      }

      // Authorization check
      const isSuperAdmin = requester.role === "superadmin";
      const isCommunityAdmin =
        requester.role === "admin" &&
        requester.community?.toString() === communityId;

      if (!isSuperAdmin && !isCommunityAdmin) {
        return res.status(403).json({ success: false, message: "Unauthorized to assign this community" });
      }

      // Assign community
      userToUpdate.community = communityId;
      userToUpdate.communityStatus = "approved";
      userToUpdate.status = true;
      await userToUpdate.save();

      // Send email notification with community details and login credentials
      if (userToUpdate.email || userToUpdate.phone) {
        try {
          // Send simple approval email without credentials
          await emailService.sendJoinApprovalEmail(
            userToUpdate.email || userToUpdate.phone,
            userToUpdate.firstName,
            community.name
          );
        } catch (emailError) {
          console.error('Failed to send community assignment email:', emailError);
          // Don't fail the request if email fails
        }
      }

      return res.status(200).json({
        success: true,
        message: "Community assigned successfully. User has been notified via email.",
        user: {
          id: userToUpdate._id,
          name: `${userToUpdate.firstName} ${userToUpdate.lastName}`,
          community: userToUpdate.community,
          communityStatus: userToUpdate.communityStatus,
        },
      });
    } catch (err) {
      console.error("Assign community error:", err);
      return res.status(500).json({ success: false, message: "Server error", error: err.message });
    }


  }

  // GET /api/users/pending - Fetch all users with pending community status
  getPendingUsers = async (req, res, next) => {
    try {
      const { user } = req; // from isAuthenticated middleware

      // Authorization check - only superadmin can access
      if (user.role !== "superadmin") {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only superAdmin is allowed",
        });
      }

      let query = { communityStatus: "pending" };

      const pendingUsers = await this.model.find(query)
        .populate('community', 'name code')
        .select('-password') // Exclude hashed password
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: "Pending users fetched successfully",
        count: pendingUsers.length,
        users: pendingUsers,
      });

    } catch (err) {
      next(err);
    }
  };

  updateOwnProfile = async (req, res, next) => {
    try {
      const { user } = req; // from isAuthenticated middleware
      const updateData = req.body;

      // Define allowed fields that users can update for their own profile
      const allowedFields = [
        'firstName', 'lastName', 'email', 'phone', 'gender', 'occupation',
        'profileImage', 'religion', 'motherTongue', 'interests',
        'cast', 'fatherName', 'address', 'pinCode', 'alternativePhone',
        'maritalStatus', 'gotra', 'subGotra'
      ];

      // Filter updateData to only include allowed fields
      const filteredUpdateData = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdateData[key] = updateData[key];
        }
      });

      // Check if there are any fields to update
      if (Object.keys(filteredUpdateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields provided for update"
        });
      }

      // Update the user's profile
      const updatedUser = await this.model.findByIdAndUpdate(
        user.id,
        filteredUpdateData,
        { new: true, runValidators: true }
      ).select('-password');


      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser
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

  // GET /api/users/city-search?query=delhi - Search users by address or pincode within same community
  citySearch = async (req, res, next) => {
    try {
      const { user } = req; // from isAuthenticated middleware
      const { query } = req.query;

      // Validate query parameter
      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Search query is required"
        });
      }

      // Ensure user belongs to a community
      if (!user.community) {
        return res.status(403).json({
          success: false,
          message: "You must belong to a community to search members"
        });
      }

      // Case-insensitive partial match in address and pinCode fields
      const searchRegex = new RegExp(query.trim(), 'i');

      const matchedUsers = await this.model.find({
        community: user.community, // Only users from same community
        $or: [
          { address: searchRegex },
          { pinCode: searchRegex }
        ]
      })
        .select('firstName lastName email phone address pinCode code gender occupation profileImage roleInCommunity gotra subGotra')
        .sort({ firstName: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        message: "City search completed successfully",
        count: matchedUsers.length,
        users: matchedUsers
      });

    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/users/:userId - Delete user permanently from database
  deleteUser = async (req, res, next) => {
    try {
      const { user: adminUser } = req; // from isAuthenticated middleware
      const { userId } = req.params;

      // Authorization check - only superadmin or community admin can delete users
      if (adminUser.role !== "superadmin" && adminUser.roleInCommunity !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only superadmin or community admin can delete users"
        });
      }

      // Find the user to be deleted
      const userToDelete = await User.findById(userId);
      if (!userToDelete) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // If community admin, verify they can only delete users from their own community
      if (adminUser.roleInCommunity === "admin" && adminUser.role !== "superadmin") {
        if (!userToDelete.community || userToDelete.community.toString() !== adminUser.community._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "Access denied: You can only delete users from your own community"
          });
        }
      }

      // Prevent deleting yourself
      if (userToDelete._id.toString() === adminUser.id.toString()) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete yourself"
        });
      }

      // Delete the user permanently
      await User.findByIdAndDelete(userId);

      return res.status(200).json({
        success: true,
        message: `User ${userToDelete.firstName} ${userToDelete.lastName} has been permanently deleted`,
        data: {
          userId: userToDelete._id,
          userName: `${userToDelete.firstName} ${userToDelete.lastName}`
        }
      });

    } catch (err) {
      next(err);
    }
  };

  // GET /api/users/family-tree/search - Search family tree members (Issue #17 fix)
  familyTreeSearch = async (req, res, next) => {
    try {
      const { user } = req; // from isAuthenticated middleware
      const { q, communityId, gotra, subGotra, limit = 50 } = req.query;

      // Validate query parameter
      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Search query (q) is required"
        });
      }

      // Determine community to search in
      let searchCommunity = communityId || user.community;
      if (!searchCommunity) {
        return res.status(403).json({
          success: false,
          message: "Community ID is required for search"
        });
      }

      // Build search query
      const searchRegex = new RegExp(q.trim(), 'i');
      const searchQuery = {
        community: searchCommunity,
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { code: searchRegex }, // User code
          { cGotNo: searchRegex }, // Code/Gotra Number
        ]
      };

      // Add optional filters
      if (gotra) {
        searchQuery.gotra = gotra;
      }
      if (subGotra) {
        searchQuery.subGotra = subGotra;
      }

      // Execute search with indexed fields for performance
      const results = await this.model.find(searchQuery)
        .select('firstName lastName email phone code cGotNo gender occupation profileImage gotra subGotra fatherName address pinCode maritalStatus roleInCommunity createdAt')
        .limit(parseInt(limit))
        .sort({ firstName: 1, lastName: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        message: "Family tree search completed",
        count: results.length,
        results: results
      });

    } catch (err) {
      next(err);
    }
  };


}

module.exports = new UserController();
