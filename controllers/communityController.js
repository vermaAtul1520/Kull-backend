const Community = require('../models/Community');

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
