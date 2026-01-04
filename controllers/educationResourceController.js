const EducationResource = require("../models/EducationResource");
const BaseController = require("../utils/baseController");

class EducationResourceController extends BaseController {
  constructor() {
    super(EducationResource);
  }

  // Create Resource
  createResource = async (req, res, next) => {
    try {
      if (req.user.isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message:
              "Community is required when creating education resource as super admin",
          });
        }
        req.body.createdBy = req.body.createdBy || req.user.id;
      } else {
        req.body.community = req.user.community;
        req.body.createdBy = req.user.id;
      }

      const resource = await this.model.create(req.body);
      res.status(201).json({ success: true, data: resource });
    } catch (err) {
      next(err);
    }
  };

  // Get all Resources
  getAllResources = async (req, res, next) => {
    try {
      if (req.user.isSuperAdmin) {
        // SuperAdmin: can see all educational resources across all communities
        // No additional filter needed
      } else {
        // Community Admin and Regular Users: see all educational resources in their community
        if (!req.user.community) {
          return res.status(403).json({
            success: false,
            message: "Community access is required to view educational resources",
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

  // Get single Resource
  getResource = (req, res, next) => {
    try {
      return this.getOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Update Resource (only in own community unless superadmin)
  updateResource = async (req, res, next) => {
    try {
      const resource = await this.model.findById(req.params.id);
      if (!resource) {
        return res
          .status(404)
          .json({ success: false, message: "Education Resource not found" });
      }

      if (!req.user.isSuperAdmin) {
        if (resource.community.toString() !== req.user.community._id.toString()) {
          return res.status(403).json({
            success: false,
            message:
              "Not authorized to update resource outside your community",
          });
        }
      }

      return this.updateOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Delete Resource (restricted same as update)
  deleteResource = async (req, res, next) => {
    try {
      const resource = await this.model.findById(req.params.id);
      if (!resource) {
        return res
          .status(404)
          .json({ success: false, message: "Education Resource not found" });
      }

      if (!req.user.isSuperAdmin) {
        if (resource.community.toString() !== req.user.community._id.toString()) {
          return res.status(403).json({
            success: false,
            message:
              "Not authorized to delete resource outside your community",
          });
        }
      }

      return this.deleteOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new EducationResourceController();
