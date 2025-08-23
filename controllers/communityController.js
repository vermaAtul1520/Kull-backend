const {Community,CommunityConfiguration} = require('../models/Community');
const User = require('../models/User');

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
// Create or update configuration (1:1 per community)
exports.createOrUpdateConfiguration = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const updateData = req.body; // Accepts any field(s) dynamically

    // 1. Check if community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    // 2. Upsert the configuration with only provided fields (partial update)
    const config = await CommunityConfiguration.findOneAndUpdate(
      { community: communityId },
      {
        $set: { ...updateData, community: communityId }, // Partial update
      },
      {
        new: true, // Return updated doc
        upsert: true, // Create if not exists
        setDefaultsOnInsert: true,
      }
    );

    // 3. Link config to community if not already linked
    if (!community.communityConfiguration) {
      community.communityConfiguration = config._id;
      await community.save();
    }

    return res.status(200).json({ success: true, data: config });

  } catch (err) {
    next(err);
  }
};

// Get Configuration by Community ID
exports.getConfigurationByCommunityId = async (req, res, next) => {
  try {
    const { communityId } = req.params;

    const config = await CommunityConfiguration.findOne({ community: communityId })
    .populate('community', '_id name code description'); 
    if (!config) {
      return res.status(404).json({ success: false, message: "Configuration not found" });
    }

    return res.status(200).json({ success: true, data: config });
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


exports.getUsersByCommunityId = async (req, res, next) => {
  try {
    const { communityId } = req.params;

    // Validate input
    if (!communityId) {
      return res.status(400).json({
        success: false,
        message: "Community ID is required"
      });
    }

    // Find users that belong to the given community
    const users = await User.find({ community: communityId })
      .select('-password  -community'); 

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};