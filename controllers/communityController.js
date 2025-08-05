const {Community,CommunityConfiguration} = require('../models/Community');

// Create new community
exports.createCommunity = async (req, res, next) => {
  try {
    const { name, description, createdBy } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({ success: false, message: "Community name is required" });
    }

    const existing = await Community.findOne({ name });
    if (existing) {
      return res.status(409).json({ success: false, message: "Community name already exists" });
    }

    const newCommunity = await Community.create({
      name,
      description,
      createdBy, // optional now
    });

    return res.status(201).json({
      success: true,
      message: "Community created successfully",
      community: newCommunity,
    });
  } catch (error) {
    next(error);
  }
};



// Create Configuration (1:1 per community)
exports.createConfiguration = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { smaajKeTaaj } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    // Prevent duplicate configuration
    const existing = await CommunityConfiguration.findOne({ community: communityId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Configuration already exists" });
    }

    // Create configuration
    const config = await CommunityConfiguration.create({
      community: communityId,
      smaajKeTaaj: smaajKeTaaj || {},
    });

    // Link configuration in Community
    community.communityConfiguration = config._id;
    await community.save();

    return res.status(201).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
};

// Get Configuration by Community ID
exports.getConfigurationByCommunityId = async (req, res, next) => {
  try {
    const { communityId } = req.params;

    const config = await CommunityConfiguration.findOne({ community: communityId });
    if (!config) {
      return res.status(404).json({ success: false, message: "Configuration not found" });
    }

    return res.status(200).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
};

// Update Configuration
exports.updateConfiguration = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { smaajKeTaaj } = req.body;

    const updated = await CommunityConfiguration.findOneAndUpdate(
      { community: communityId },
      { smaajKeTaaj },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Configuration not found" });
    }

    return res.status(200).json({ success: true, message: "Configuration updated", data: updated });
  } catch (err) {
    next(err);
  }
};

// Delete Configuration
exports.deleteConfiguration = async (req, res, next) => {
  try {
    const { communityId } = req.params;

    const deleted = await CommunityConfiguration.findOneAndDelete({ community: communityId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "No configuration found to delete" });
    }

    // Optional: unlink from community
    await Community.findByIdAndUpdate(communityId, {
      $unset: { communityConfiguration: 1 }
    });

    return res.status(200).json({ success: true, message: "Configuration deleted successfully" });
  } catch (err) {
    next(err);
  }
};
