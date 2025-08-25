const BaseController = require("../utils/baseController");
const Bhajan = require("../models/Bhajan");
const { Community } = require("../models/Community");

class CommunityBhajansController extends BaseController {
  constructor() {
    super(Bhajan);
  }

  // Create Bhajan (only SuperAdmin or CommunityAdmin)
  createBhajan = async (req, res, next) => {
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

      const community = await Community.findById(communityId);
      if (!community) return res.status(404).json({ success: false, message: "Community not found" });

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

      res.status(201).json({ success: true, data: bhajan });
    } catch (err) {
      next(err);
    }
  };

  // Get all Bhajans for a Community (with pagination/filter/sort via BaseController)
  getBhajansByCommunity = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      req.parsedQuery.filter = { ...(req.parsedQuery.filter || {}), community: communityId };
      return  this.getAll(req, res, next); ;
    } catch (err) {
      next(err);
    }
  };

  // Get Bhajan by ID
  getBhajanById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const bhajan = await Bhajan.findById(id).populate("community", "name code");
      if (!bhajan) return res.status(404).json({ success: false, message: "Bhajan not found" });
      res.status(200).json({ success: true, data: bhajan });
    } catch (err) {
      next(err);
    }
  };

  // Update Bhajan
  updateBhajan = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role, roleInCommunity, community } = req.user;

      const bhajan = await Bhajan.findById(id);
      if (!bhajan) return res.status(404).json({ message: "Bhajan not found" });

      const isSuperAdmin = role === "superadmin";
      const isCommunityAdminAndOwn = roleInCommunity === "admin" && bhajan.community.toString() === community.toString();

      if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
        return res.status(403).json({ message: "Not authorized to update this Bhajan" });
      }

      Object.assign(bhajan, req.body);
      await bhajan.save();

      res.status(200).json({ success: true, data: bhajan });
    } catch (err) {
      next(err);
    }
  };

  // Delete Bhajan
  deleteBhajan = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role, roleInCommunity, community } = req.user;

      const bhajan = await Bhajan.findById(id);
      if (!bhajan) return res.status(404).json({ message: "Bhajan not found" });

      const isSuperAdmin = role === "superadmin";
      const isCommunityAdminAndOwn = roleInCommunity === "admin" && bhajan.community.toString() === community.toString();

      if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
        return res.status(403).json({ message: "Not authorized to delete this Bhajan" });
      }

      await bhajan.deleteOne();
      res.status(200).json({ success: true, message: "Bhajan deleted successfully" });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new CommunityBhajansController();
