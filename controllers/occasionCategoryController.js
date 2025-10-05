const { OccasionCategory } = require("../models/Occasion");
const BaseController = require("../utils/baseController");

class OccasionCategoryController extends BaseController {
  constructor() {
    super(OccasionCategory);
  }

  
  // Create OccasionCategory
  createCategory = async (req, res, next) => {
    try {
      // Super admin must provide community
      if (req.user.isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating category as super admin",
          });
        }
      } else {
        req.body.community = req.user.community;
      }

      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: "Category name is required" });
      }

      // Check if category already exists in this community
      const existingCategory = await this.model.findOne({
        name,
        community: req.body.community,
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists in this community",
        });
      }

      const category = await this.model.create({
        name,
        description,
        community: req.body.community,
      });

      res.status(201).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  };

  // Get all OccasionCategories
  getAllCategories = async (req, res, next) => {
    try {
      // Filter based on user role and community
      if (req.user.isSuperAdmin) {
        // Super admin can see all, but filter by community if provided
        if (req.query.community) {
          req.parsedQuery.filter = {
            ...req.parsedQuery.filter,
            community: req.query.community,
          };
        }
      } else {
        // Community admin and normal users see only their community's categories
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

  // Get single OccasionCategory
  getCategory = async (req, res, next) => {
    try {
      const category = await this.model.findById(req.params.id);

      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }

      // Check community access
      if (!req.user.isSuperAdmin && category.community.toString() !== req.user.community.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this category",
        });
      }

      res.status(200).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  };

  // Update OccasionCategory
  updateCategory = async (req, res, next) => {
    try {
      const category = await this.model.findById(req.params.id);

      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }

      // Check authorization
      if (!req.user.isSuperAdmin && category.community.toString() !== req.user.community.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update category outside your community",
        });
      }

      // Check for duplicate name in same community
      if (req.body.name && req.body.name !== category.name) {
        const existingCategory = await this.model.findOne({
          name: req.body.name,
          community: category.community,
          _id: { $ne: req.params.id },
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: "Category with this name already exists in this community",
          });
        }
      }

      // Update allowed fields
      const allowedUpdates = ["name", "description"];
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) category[field] = req.body[field];
      });

      await category.save();
      res.status(200).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  };

  // Delete OccasionCategory
  deleteCategory = async (req, res, next) => {
    try {
      const category = await this.model.findById(req.params.id);

      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }

      // Check authorization
      if (!req.user.isSuperAdmin && category.community.toString() !== req.user.community.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete category outside your community",
        });
      }

      await category.deleteOne();
      res.status(200).json({ success: true, message: "Category deleted successfully" });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new OccasionCategoryController();
