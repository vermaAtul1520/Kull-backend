const BaseController = require("../utils/baseController");
const { Community, CommunityConfiguration } = require("../models/Community");
const User = require("../models/User");

class CommunityController extends BaseController {
  constructor() {
    super(Community); // For generic CRUD on Community
  }

  // Traditional community creation
  createCommunity = async (req, res, next) => {
    try {
      const { name, description, createdBy } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: "Community name is required" });
      }

      const existing = await Community.findOne({ name });
      if (existing) {
        return res.status(409).json({ success: false, message: "Community name already exists" });
      }

      const newCommunity = await Community.create({ name, description, createdBy });
      res.status(201).json({ success: true, message: "Community created successfully", community: newCommunity });
    } catch (err) {
      next(err);
    }
  };

  // listing 
  listCommunities = async (req, res, next) => {
    try {
      return this.getAll(req, res, next); // BaseController already supports parsedQuery
    } catch (err) {
      next(err);
    }
  };

   // Get one community detail
  getCommunityById = async (req, res, next) => {
    try {
      return this.getOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Delete one community
  deleteCommunity = async (req, res, next) => {
    try {
      return this.deleteOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  updateCommunity = (req, res, next) => {
    try {
      return this.updateOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };


  // Create or update community configuration (upsert)
  createOrUpdateConfiguration = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const updateData = req.body;

      const community = await Community.findById(communityId);
      if (!community) return res.status(404).json({ success: false, message: "Community not found" });

      const config = await CommunityConfiguration.findOneAndUpdate(
        { community: communityId },
        { $set: { ...updateData, community: communityId } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!community.communityConfiguration) {
        community.communityConfiguration = config._id;
        await community.save();
      }

      res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  };

  getConfigurationByCommunityId = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const config = await CommunityConfiguration.findOne({ community: communityId })
        .populate("community", "_id name code description");

      if (!config) return res.status(404).json({ success: false, message: "Configuration not found" });

      res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  };

  deleteConfiguration = async (req, res, next) => {
    try {
      const { communityId } = req.params;

      const deleted = await CommunityConfiguration.findOneAndDelete({ community: communityId });
      if (!deleted) return res.status(404).json({ success: false, message: "No configuration found to delete" });

      await Community.findByIdAndUpdate(communityId, { $unset: { communityConfiguration: 1 } });
      res.status(200).json({ success: true, message: "Configuration deleted successfully" });
    } catch (err) {
      next(err);
    }
  };

  // BaseController-powered method for users in a community
  getUsersByCommunityId = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      req.parsedQuery.filter = { ...(req.parsedQuery.filter || {}), community: communityId };
      // Use BaseController's getAll logic
      const userController = new BaseController(User);
      return userController.getAll(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  getOfficerForCommunity = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const users = await User.find({
        communityId:communityId,
        positionInCommunity: { $exists: true, $ne: null, $ne: "" },
      });

      res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }
}
// Export a single instance
module.exports = new CommunityController();


