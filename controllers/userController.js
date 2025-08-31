const User = require("../models/User");
const {Community} = require("../models/Community");
const BaseController = require("../utils/baseController");


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
    console.log("id...",userId,req.body)

    // Find target user
    const targetUser = await this.model.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Superadmin: full access
    if (user.role === "superadmin") {
      console.log("trueeeeeeeeeeeeeeee")
      Object.assign(targetUser, updateData);
      await targetUser.save();
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
      userToUpdate.status=true
      await userToUpdate.save();

      return res.status(200).json({
        success: true,
        message: "Community assigned successfully",
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
}

module.exports = new UserController();
