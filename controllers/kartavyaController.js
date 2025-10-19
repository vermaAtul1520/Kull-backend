const Kartavya = require("../models/Kartavya");
const BaseController = require("../utils/baseController");

class KartavyaController extends BaseController {
  constructor() {
    super(Kartavya);
  }

  // Create Kartavya
  createKartavya = async (req, res, next) => {
    try {
      if (req.user.isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating Kartavya as super admin",
          });
        }
        req.body.createdBy = req.body.createdBy || req.user.id;
      } else {
        req.body.community = req.user.community;
        req.body.createdBy = req.user.id;
      }

      const kartavya = await this.model.create(req.body);
      res.status(201).json({ success: true, data: kartavya });
    } catch (err) {
      next(err);
    }
  };

  // Get all Kartavyas
  getAllKartavyas = async (req, res, next) => {
    try {
      if (req.user.isCommunityAdmin) {
        req.parsedQuery.filter = {
          ...req.parsedQuery.filter,
          community: req.user.community,
        };
      } else if (!req.user.isSuperAdmin) {
        // Regular users see all kartavyas in their community
        req.parsedQuery.filter = {
          ...req.parsedQuery.filter,
          community: req.user.community,
        };
      }
      return this.getAll(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Get single Kartavya
  getKartavya = (req, res, next) => {
    try {
      return this.getOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Update Kartavya
  updateKartavya = async (req, res, next) => {
    try {
      const kartavya = await this.model.findById(req.params.id);
      if (!kartavya) {
        return res.status(404).json({ success: false, message: "Kartavya not found" });
      }

      if (!req.user.isSuperAdmin) {
        if (kartavya.community.toString() !== req.user.community.toString()) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to update Kartavya outside your community",
          });
        }
      }

      return this.updateOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Delete Kartavya
  deleteKartavya = async (req, res, next) => {
    try {
      const kartavya = await this.model.findById(req.params.id);
      if (!kartavya) {
        return res.status(404).json({ success: false, message: "Kartavya not found" });
      }

      if (!req.user.isSuperAdmin) {
        if (kartavya.community.toString() !== req.user.community.toString()) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to delete Kartavya outside your community",
          });
        }
      }

      return this.deleteOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new KartavyaController();
