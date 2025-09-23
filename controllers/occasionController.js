const Occasion = require("../models/Occasion");
const BaseController = require("../utils/baseController");

class OccasionController extends BaseController {
  constructor() {
    super(Occasion);
  }

  // Create Occasion
  createOccasion = async (req, res, next) => {
    try {
      if (req.user.isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating Occasion as super admin",
          });
        }
        req.body.createdBy = req.body.createdBy || req.user.id;
      } else {
        req.body.community = req.user.community;
        req.body.createdBy = req.user.id;
      }

      const occasion = await this.model.create(req.body);
      res.status(201).json({ success: true, data: occasion });
    } catch (err) {
      next(err);
    }
  };

  // Get all Occasions
  getAllOccasions = async (req, res, next) => {
    try {
      if (req.user.isCommunityAdmin) {
        req.parsedQuery.filter = {
          ...req.parsedQuery.filter,
          community: req.user.community,
        };
      } else if (!req.user.isSuperAdmin) {
        req.parsedQuery.filter = {
          ...req.parsedQuery.filter,
          createdBy: req.user.id,
        };
      }
      return this.getAll(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Get single Occasion
  getOccasion = (req, res, next) => {
    try {
      return this.getOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Update Occasion
  updateOccasion = async (req, res, next) => {
    try {
      const occasion = await this.model.findById(req.params.id);
      if (!occasion) {
        return res.status(404).json({ success: false, message: "Occasion not found" });
      }

      if (!req.user.isSuperAdmin) {
        if (occasion.community.toString() !== req.user.community.toString()) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to update Occasion outside your community",
          });
        }
      }

      return this.updateOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Delete Occasion
  deleteOccasion = async (req, res, next) => {
    try {
      const occasion = await this.model.findById(req.params.id);
      if (!occasion) {
        return res.status(404).json({ success: false, message: "Occasion not found" });
      }

      if (!req.user.isSuperAdmin) {
        if (occasion.community.toString() !== req.user.community.toString()) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to delete Occasion outside your community",
          });
        }
      }

      return this.deleteOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new OccasionController();
