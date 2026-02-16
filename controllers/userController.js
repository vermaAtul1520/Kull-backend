// controllers/userController.js
// Refactored to use UserService and CommunityService

const { getUserService } = require("../services/userService");
const { getCommunityService } = require("../services/communityService");
const emailService = require("../services/emailService");

const userService = getUserService();
const communityService = getCommunityService();

// Update Own Profile
exports.updateOwnProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Remove sensitive or restricted fields from updates
    delete updates.password;
    delete updates.role;
    delete updates.communityStatus;
    delete updates.community;

    // Filter null/undefined
    Object.keys(updates).forEach(key => (updates[key] === null || updates[key] === undefined) && delete updates[key]);

    const updatedUser = await userService.updateProfile(userId, updates);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
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

    const updatedUser = await userService.updateProfile(userId, updates);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
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
    const userId = req.user.id;

    if (!communityId) {
      return res.status(400).json({ success: false, message: "Community ID is required" });
    }

    const community = await communityService.getCommunityById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    // Update user
    const updatedUser = await userService.updateProfile(userId, {
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

    // Fetch users with status 'pending' in community
    const pendingUsers = await userService.userRepo.find({
      community: communityId,
      communityStatus: 'pending'
    });

    res.status(200).json({ success: true, count: pendingUsers.length, data: pendingUsers });
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
    const { id } = req.params;

    // Super admin only? Or self delete?
    if (req.user.role !== 'superadmin' && req.user.id !== id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await userService.deleteUser(id);
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};


exports.citySearch = async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).json({ success: false, message: "City is required" });

    // Use regex search on city field
    const query = { city: { $regex: city, $options: 'i' } };
    // If we want to restrict to community (optional)
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
