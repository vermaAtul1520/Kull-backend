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
      if (req.user.isSuperAdmin) {
        // SuperAdmin: can see all dukaans across all communities
        // No additional filter needed
      } else {
        // Community Admin and Regular Users: see all dukaans in their community
        if (!req.user.community) {
          return res.status(403).json({
            success: false,
            message: "Community access is required to view dukaans",
          });
        }

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

  // Get single Dukaan
  getDukaan = (req, res, next) => {
    try {
      return this.getOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Update Dukaan
  updateDukaan = async (req, res, next) => {
    try {
      // Restriction logic
      if (!req.user.isSuperAdmin) {
        // Community admin or normal user - check if dukaan belongs to their community
        const dukaan = await this.model.findById(req.params.id);
        if (!dukaan) {
          return res.status(404).json({
            success: false,
            message: "Dukaan not found",
          });
        }

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
  deleteDukaan = async (req, res, next) => {
    try {
      // Restriction logic
      if (!req.user.isSuperAdmin) {
        // Community admin or normal user - check if dukaan belongs to their community
        const dukaan = await this.model.findById(req.params.id);
        if (!dukaan) {
          return res.status(404).json({
            success: false,
            message: "Dukaan not found",
          });
        }

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
