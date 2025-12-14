const Appeal = require("../models/Appeal");
const BaseController = require("../utils/baseController");

class AppealController extends BaseController {
  constructor() {
    super(Appeal);
  }

  // Create Appeal - Issue #23 fix
  createAppeal = async (req, res, next) => {
    try {
      // Check if user has a community
      if (!req.user.community && !req.user.isSuperAdmin) {
        return res.status(400).json({
          success: false,
          message: "You must belong to a community to submit an appeal",
        });
      }

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
      } else {
        // Regular users and community admins
        req.body.community = req.user.community; // lock to own community
        req.body.user = req.user.id; // Set the user who created the appeal
      }

      const appeal = await this.model.create(req.body);
      res.status(201).json({ 
        success: true, 
        message: "Appeal submitted successfully",
        data: appeal 
      });
    } catch (err) {
      next(err);
    }
  };

  // Get all Appeals (alias for compatibility)
  getAll = async (req, res, next) => {
    try {
        // Inject role-based restrictions into queryParser filter
        // Check roleInCommunity directly instead of relying on isCommunityAdmin flag
        // This is more reliable as isCommunityAdmin might be incorrectly set due to community population issues
        if (req.user.roleInCommunity === "admin" && req.user.community) {
          // Community admin sees all appeals in their community
          req.parsedQuery.filter = {
              ...req.parsedQuery.filter,
              community: req.user.community,
          };
        } else if (!req.user.isSuperAdmin) {
          // Regular users see only their own appeals
          req.parsedQuery.filter = {
              ...req.parsedQuery.filter,
              user: req.user.id,
          };
        }
        // Superadmin → no restrictions

        // Use the inherited getAll method directly
        const { filter, sort, projection, skip, limit, page } = req.parsedQuery;
        const docs = await this.model.find(filter).select(projection || "").sort(sort).skip(skip).limit(limit);
        const total = await this.model.countDocuments(filter);

        res.status(200).json({ success: true, total, page, limit, count: docs.length, data: docs });
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
