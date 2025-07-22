const User = require("../models/User");
const Community = require("../models/Community");

// PUT /api/users/:userId/assign-community
exports.assignCommunityToUser = async (req, res) => {
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
};
