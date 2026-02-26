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

    // If admin is updating password, hash it before saving
    if (updates.password) {
      const bcrypt = require('bcryptjs');
      const plainPassword = updates.password;
      updates.password = await bcrypt.hash(plainPassword, 10);
      updates.plainTextPassword = plainPassword;
    }

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

    // Superadmin or community admin assigns → auto-approve
    // Regular user self-assigns → pending
    const isAdmin = req.user.role === 'superadmin' || req.user.roleInCommunity === 'admin';
    const newStatus = isAdmin ? "approved" : "pending";

    const updatedUser = await userService.updateUser(userId, {
      community: communityId,
      communityStatus: newStatus,
    });

    const message = isAdmin
      ? "Community assigned and user approved successfully."
      : "Community assigned successfully. Pending approval.";

    res.status(200).json({
      success: true,
      message,
      data: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.getPendingUsers = async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'superadmin';
    const userCommId = (req.user.community?._id || req.user.community?.id || req.user.community)?.toString();

    // targetCommunityId priority: query param > user's home community (only for non-superadmins)
    let targetCommunityId = req.query.communityId;

    if (!targetCommunityId && !isSuperAdmin) {
      targetCommunityId = userCommId;
    }

    // Security check for non-superadmins
    if (!isSuperAdmin) {
      if (!targetCommunityId) {
        return res.status(403).json({ success: false, message: "Community access required" });
      }
      // Community admins can only see their own community
      if (req.user.roleInCommunity === 'admin' && targetCommunityId !== userCommId) {
        return res.status(403).json({ success: false, message: "Access denied to other communities" });
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Fetch users with status 'pending'
    let query = { communityStatus: 'pending' };

    // Filter by community if specified (or if restricted by role)
    if (targetCommunityId) {
      query.communityId = targetCommunityId;
    }

    const pendingUsers = await userService.userRepo.find(query, { limit, skip, sort: { createdAt: -1 } });
    const total = await userService.userRepo.count(query);

    const sanitizedUsers = pendingUsers.map(user => userService.sanitizeUser(user));

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
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

    // Check role first — superadmins can approve any user
    if (req.user.role !== 'superadmin' && req.user.roleInCommunity !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const targetUser = await userService.getUserById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

    // Community admins can only approve users in their own community
    if (req.user.role !== 'superadmin' && String(targetUser.community) !== String(req.user.community)) {
      return res.status(403).json({ success: false, message: "User does not belong to your community" });
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

    // Check role first — superadmins can reject any user
    if (req.user.role !== 'superadmin' && req.user.roleInCommunity !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const targetUser = await userService.getUserById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

    // Community admins can only reject users in their own community
    if (req.user.role !== 'superadmin' && String(targetUser.community) !== String(req.user.community)) {
      return res.status(403).json({ success: false, message: "User does not belong to your community" });
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

    // Enforce community filter (critical security filter)
    const userCommId = (req.user.community?._id || req.user.community?.id || req.user.community)?.toString();
    const targetCommunityId = req.query.communityId || userCommId;

    if (targetCommunityId) {
      query.community = targetCommunityId;
    } else if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: "Community access required" });
    }

    console.log('City Search Query:', JSON.stringify(query));

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await userService.userRepo.find(query, { limit, skip });
    const total = await userService.userRepo.count(query);

    const sanitizedUsers = users.map(u => userService.sanitizeUser(u));

    res.json({
      success: true,
      total,
      page,
      limit,
      count: sanitizedUsers.length,
      data: sanitizedUsers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.familyTreeSearch = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) return res.status(400).json({ success: false, message: "Search term required" });

    const communityId = (req.user.community?._id || req.user.community?.id || req.user.community)?.toString();

    // Safety check: if not superadmin, communityId is mandatory
    if (req.user.role !== 'superadmin' && !communityId) {
      return res.status(403).json({ success: false, message: "Community isolation error: No community assigned" });
    }

    const users = await userService.searchCommunityUsers(communityId, { search: search }, { limit: 50 });

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
