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
        const body = JSON.stringify(req.body);
        console.log("in craeet categoryy---",body)
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: `Community is required when creating category as super admin , ${req.user.isSuperAdmin},${body}`,
          });
        }
      } else {
        req.body.community = req.user.community;
      }

      const { name, description, occasionType } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: "Category name is required" });
      }
      if (!occasionType) {
        return res.status(400).json({ success: false, message: "Occasion type is required" });
      }

      // Check if category already exists in this community with same occasion type
      const existingCategory = await this.model.findOne({
        name,
        occasionType,
        community: req.body.community,
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists for this occasion type in this community",
        });
      }

      const category = await this.model.create({
        name,
        description,
        occasionType,
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

      const { filter, sort, projection } = req.parsedQuery;
      const docs = await this.model.find(filter).select(projection || "").sort(sort);
      const total = await this.model.countDocuments(filter);

      return res.status(200).json({ success: true, total, count: docs.length, data: docs });
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
      if (!req.user.isSuperAdmin && category.community.toString() !== req.user.community._id.toString()) {
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
      if (!req.user.isSuperAdmin && category.community.toString() !== req.user.community._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update category outside your community",
        });
      }

      // Check for duplicate name in same community and occasion type
      if (req.body.name && req.body.name !== category.name) {
        const existingCategory = await this.model.findOne({
          name: req.body.name,
          occasionType: req.body.occasionType || category.occasionType,
          community: category.community,
          _id: { $ne: req.params.id },
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: "Category with this name already exists for this occasion type in this community",
          });
        }
      }

      // Update allowed fields
      const allowedUpdates = ["name", "description", "occasionType"];
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
      if (!req.user.isSuperAdmin && category.community.toString() !== req.user.community._id.toString()) {
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
