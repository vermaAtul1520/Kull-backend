const Appeal = require("../models/appeal");
const BaseController = require("../utils/baseController");

class AppealController extends BaseController {
  constructor() {
    super(Appeal);
  }

  // Create Appeal
  createAppeal = async (req, res, next) => {
    try {

      // If superadmin, community must be passed explicitly
       if (req.user.isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating appeal as super admin",
          });
        }
        // user (creator) can be provided, but fallback to superadmin's own id
        req.body.user = req.body.user || req.user.id;
      }else{
        req.body.community = req.user.community; // lock to own community
        req.body.createdBy = req.user.id;
      }

      const appeal = await this.model.create(req.body);
      res.status(201).json({ success: true, data: appeal });
    } catch (err) {
      next(err);
    }
  };

  // Get all Appeals
  getAllAppeal = async (req, res, next) => {
    try {
        // Inject role-based restrictions into queryParser filter
        if (req.user.isCommunityAdmin) {
        req.parsedQuery.filter = {
            ...req.parsedQuery.filter,
            community: req.user.community,
        };
        } else if (!req.user.isSuperAdmin) {
        req.parsedQuery.filter = {
            ...req.parsedQuery.filter,
            user: req.user.id,
        };
        }
        // Superadmin → no restrictions

        // Delegate to BaseController
        return this.getAll(req, res, next);
    } catch (err) {
        next(err);
    }
};  

  // Get single Appeal
  getAppeal = async (req, res, next) => {
    try {
      return this.getOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Delete one community
  deleteAppeal = async (req, res, next) => {
    try {
      return this.deleteOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  updateAppeal = (req, res, next) => {
    try {
      return this.updateOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  
}

module.exports = new AppealController();
