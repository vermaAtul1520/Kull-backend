// controllers/dukaanController.js
const Dukaan = require("../models/Dukaan");
const BaseController = require("../utils/baseController");

class DukaanController extends BaseController {
  constructor() {
    super(Dukaan);
  }

  // Create Dukaan
  createDukaan = async (req, res, next) => {
    try {
      if (req.user.isSuperAdmin) {
        // superadmin must explicitly pass community
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating Dukaan as super admin",
          });
        }
        req.body.createdBy = req.body.createdBy || req.user.id;
      } else {
        // community admin or normal user
        req.body.community = req.user.community;
        req.body.createdBy = req.user.id;
      }

      const dukaan = await this.model.create(req.body);
      res.status(201).json({ success: true, data: dukaan });
    } catch (err) {
      next(err);
    }
  };

  // Get all Dukaans
  getAllDukaans = async (req, res, next) => {
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

  // Get single Dukaan
  getDukaan = (req, res, next) => {
    try {
      return this.getOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Update Dukaan
  updateDukaan = (req, res, next) => {
    try {
        // Restriction logic
        if (!req.user.isSuperAdmin) {
        // Community admin or normal user
            if (dukaan.community.toString() !== req.user.community.toString()) {
                return res.status(403).json({
                success: false,
                message: "Not authorized to update Dukaan outside your community",
                });
            }
        }
      return this.updateOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Delete Dukaan
  deleteDukaan = (req, res, next) => {
    try {
        // Restriction logic
        if (!req.user.isSuperAdmin) {
            // Community admin or normal user
            if (dukaan.community.toString() !== req.user.community.toString()) {
                return res.status(403).json({
                success: false,
                message: "Not authorized to delete Dukaan outside your community",
                });
            }
        }
      return this.deleteOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new DukaanController();
