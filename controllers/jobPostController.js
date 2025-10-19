const JobPost = require("../models/JobPost");
const BaseController = require("../utils/baseController");

class JobPostController extends BaseController {
  constructor() {
    super(JobPost);
  }

  // Create JobPost
  createJobPost = async (req, res, next) => {
    try {
      if (req.user.isSuperAdmin) {
        // superadmin must explicitly pass community
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating JobPost as super admin",
          });
        }
        req.body.createdBy = req.body.createdBy || req.user.id;
      } else {
        // community admin or normal user
        req.body.community = req.user.community;
        req.body.createdBy = req.user.id;
      }

      const jobPost = await this.model.create(req.body);
      res.status(201).json({ success: true, data: jobPost });
    } catch (err) {
      next(err);
    }
  };

  // Get all JobPosts
  getAllJobPosts = async (req, res, next) => {
    try {
      if (req.user.isCommunityAdmin) {
        req.parsedQuery.filter = {
          ...req.parsedQuery.filter,
          community: req.user.community,
        };
      } else if (!req.user.isSuperAdmin) {
        // Regular users see all job posts in their community
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

  // Get single JobPost
  getJobPost = (req, res, next) => {
    try {
      return this.getOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Update JobPost
  updateJobPost = async (req, res, next) => {
    try {
      const jobPost = await this.model.findById(req.params.id);
      if (!jobPost) {
        return res.status(404).json({ success: false, message: "JobPost not found" });
      }

      // Restriction logic
      if (!req.user.isSuperAdmin) {
        if (jobPost.community.toString() !== req.user.community.toString()) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to update JobPost outside your community",
          });
        }
      }

      return this.updateOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Delete JobPost
  deleteJobPost = async (req, res, next) => {
    try {
      const jobPost = await this.model.findById(req.params.id);
      if (!jobPost) {
        return res.status(404).json({ success: false, message: "JobPost not found" });
      }

      // Restriction logic
      if (!req.user.isSuperAdmin) {
        if (jobPost.community.toString() !== req.user.community.toString()) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to delete JobPost outside your community",
          });
        }
      }

      return this.deleteOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new JobPostController();
