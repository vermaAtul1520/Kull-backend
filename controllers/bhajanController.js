const Bhajan = require("../models/Bhajan");
const { Community } = require("../models/Community");


/**
 * Create Bhajan (only SuperAdmin or CommunityAdmin)
 * POST /:communityId/bhajans
 */
exports.createBhajan = async (req, res) => {
  try {
    const { communityId } = req.params;
    const {
      title,
      artist,
      duration,
      views,
      youtubeUrl,
      thumbnailUrl,
      description,
      category,
    } = req.body;

    // Ensure community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    const bhajan = await Bhajan.create({
      community: communityId,
      title,
      artist,
      duration,
      views,
      youtubeUrl,
      thumbnailUrl,
      description,
      category,
    });

    return res.status(201).json({ success: true, data: bhajan });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * Get all Bhajans for a Community
 * GET /:communityId/bhajans
 */
exports.getBhajansByCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;

    const bhajans = await Bhajan.find({ community: communityId })
      .populate("community", "name code") // only project useful fields
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: bhajans });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * Get Bhajan by Id
 * GET /bhajans/:id
 */
exports.getBhajanById = async (req, res) => {
  try {
    const { id } = req.params;

    const bhajan = await Bhajan.findById(id).populate("community", "name code");
    if (!bhajan) {
      return res
        .status(404)
        .json({ success: false, message: "Bhajan not found" });
    }

    return res.status(200).json({ success: true, data: bhajan });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * Update Bhajan
 * PUT /bhajans/:id
 */
exports.updateBhajan = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, roleInCommunity, community } = req.user;

    const bhajan = await Bhajan.findById(id);
    if (!bhajan) {
      return res.status(404).json({ message: "Bhajan not found" });
    }

    // Authorization check
    const isSuperAdmin = role === "superadmin";
    const isCommunityAdminAndOwn =
      roleInCommunity === "admin" && bhajan.community.toString() === community.toString();

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({ message: "Not authorized to update this Bhajan" });
    }

    // Update bhajan
    Object.assign(bhajan, req.body);
    await bhajan.save();

    return res.status(200).json({ success: true, data: bhajan });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Delete Bhajan
 * DELETE /bhajans/:id
 */
exports.deleteBhajan = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, roleInCommunity, community } = req.user;

    const bhajan = await Bhajan.findById(id);
    if (!bhajan) {
      return res.status(404).json({ message: "Bhajan not found" });
    }

    // Authorization check
    const isSuperAdmin = role === "superadmin";
    const isCommunityAdminAndOwn =
      roleInCommunity === "admin" && bhajan.community.toString() === community.toString();

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({ message: "Not authorized to delete this Bhajan" });
    }

    await bhajan.deleteOne();

    return res.status(200).json({ success: true, message: "Bhajan deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};