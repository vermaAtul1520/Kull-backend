// controllers/userController.js
// Refactored to use UserService and CommunityService

const { getUserService } = require("../services/userService");
const { getCommunityService } = require("../services/communityService");
const emailService = require("../services/emailService");

const userService = getUserService();
const communityService = getCommunityService();

// Get Own Profile
exports.getOwnProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userService.getUserProfile(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

// Update Own Profile
exports.updateOwnProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Remove sensitive or restricted fields from updates
    // Especially important to remove primary keys for DynamoDB/MongoDB consistency
    delete updates.password;
    delete updates.role;
    delete updates.communityStatus;
    delete updates.community;
    delete updates.id;
    delete updates._id;
    delete updates.pk;
    delete updates.sk;

    // Filter null/undefined/empty string
    Object.keys(updates).forEach(key => (updates[key] === null || updates[key] === undefined || updates[key] === '') && delete updates[key]);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields provided for update" });
    }

    const updatedUser = await userService.updateProfile(userId, updates);

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

// Admin Update User
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Validate admin permissions (already checked by middleware but double check good practice)
    if (req.user.role !== 'superadmin' && req.user.roleInCommunity !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // If community admin, check if user belongs to same community
    if (req.user.roleInCommunity === 'admin' && req.user.role !== 'superadmin') {
      const targetUser = await userService.getUserById(userId);
      if (!targetUser || String(targetUser.community) !== String(req.user.community)) {
        return res.status(403).json({ success: false, message: "Access denied. User not in your community." });
      }
    }

    // Allow updating more fields?
    // Using same updateProfile method for now which might act on basic fields.
    // UserService.updateProfile delegates to repo.updateById.

    // Remove password if present (should use specific endpoint for password reset if needed)
    delete updates.password;

    const updatedUser = await userService.updateUser(userId, updates);

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.assignCommunityToUser = async (req, res) => {
  try {
    const { communityId } = req.body;
    let userId = req.params.userId; // Target user from URL

    // If no param, fallback to self (though route should have param)
    if (!userId) userId = req.user.id;

    // Authorization
    if (userId !== req.user.id) {
      // Admin check
      if (req.user.role !== 'superadmin' && req.user.roleInCommunity !== 'admin') {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    if (!communityId) {
      return res.status(400).json({ success: false, message: "Community ID is required" });
    }

    const community = await communityService.getCommunityById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    // Update user
    const updatedUser = await userService.updateUser(userId, {
      community: communityId,
      communityStatus: "pending", // Reset to pending on change
    });

    res.status(200).json({
      success: true,
      message: "Community assigned successfully. Pending approval.",
      data: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.getPendingUsers = async (req, res) => {
  try {
    const communityId = req.user.community;

    // Check if admin of community or superadmin
    if (req.user.role !== 'superadmin' && req.user.roleInCommunity !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied. Community Admin only." });
    }

    // Fetch users with status 'pending'
    let query = { communityStatus: 'pending' };

    // If not superadmin, restrict to their community
    if (req.user.role !== 'superadmin') {
      query.community = communityId;
    }

    const pendingUsers = await userService.userRepo.find(query);

    const sanitizedUsers = pendingUsers.map(user => userService.sanitizeUser(user));

    res.status(200).json({
      success: true,
      message: "Pending users fetched successfully",
      count: sanitizedUsers.length,
      users: sanitizedUsers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const { userId } = req.body;

    // Verify current user is admin of the user's community
    const targetUser = await userService.getUserById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

    if (String(targetUser.community) !== String(req.user.community)) {
      return res.status(403).json({ success: false, message: "User does not belong to your community" });
    }

    if (req.user.role !== 'superadmin' && req.user.roleInCommunity !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const updated = await userService.approveUser(userId);

    // Notification (Email)
    if (targetUser.email) {
      try {
        await emailService.sendApprovalEmail(targetUser.email, targetUser.firstName);
      } catch (e) {
        console.error("Failed to send approval email", e);
      }
    }

    res.status(200).json({ success: true, message: "User approved successfully", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const targetUser = await userService.getUserById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

    if (String(targetUser.community) !== String(req.user.community)) {
      return res.status(403).json({ success: false, message: "User does not belong to your community" });
    }

    if (req.user.role !== 'superadmin' && req.user.roleInCommunity !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const updated = await userService.rejectUser(userId);

    res.status(200).json({ success: true, message: "User rejected successfully", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Super admin only? Or self delete?
    if (req.user.role !== 'superadmin' && req.user.id !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await userService.deleteUser(userId);
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};


exports.citySearch = async (req, res) => {
  try {
    const { city, area, pincode, search } = req.query;

    if (!city && !area && !pincode && !search) {
      return res.status(400).json({ success: false, message: "At least one search parameter (city, area, pincode, search) is required" });
    }

    const query = {};

    // General search (mimics old behavior or generic search box)
    if (search) {
      query.$or = [
        { city: { $regex: search, $options: 'i' } },
        { pinCode: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    } else {
      // Specific fields search (can be combined)
      if (city) {
        // Effectively searches city or address string for city name
        query.$or = [
          { city: { $regex: city, $options: 'i' } },
          { address: { $regex: city, $options: 'i' } }
        ];
      }

      if (area) {
        query.address = { $regex: area, $options: 'i' };
      }

      if (pincode) {
        // Use regex for pinCode to support partial matches or string persistence
        query.pinCode = { $regex: pincode, $options: 'i' };
      }
    }

    // Community filter (critical security filter)
    if (req.user.community) query.community = req.user.community;

    const users = await userService.userRepo.find(query);

    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.familyTreeSearch = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) return res.status(400).json({ success: false, message: "Search term required" });

    const communityId = req.user.community;
    const users = await userService.searchUsers(search, communityId);

    // Filter result
    const filtered = users.filter(u =>
      (u.id || u._id).toString() !== req.user.id
    );

    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

// List All Users (Superadmin only)
exports.listAllUsers = async (req, res) => {
  try {
    const { filter, sort, limit, skip, page } = req.parsedQuery || {};

    // Ensure superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: "Access denied. Superadmin only." });
    }

    const users = await userService.getAllUsers({ filter, sort, limit, skip });
    const total = await userService.userRepo.count(filter);

    const sanitizedUsers = users.map(user => userService.sanitizeUser(user));

    res.status(200).json({
      success: true,
      total,
      page: page || 1,
      limit: limit || 20,
      count: sanitizedUsers.length,
      data: sanitizedUsers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};
