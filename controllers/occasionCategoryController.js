// controllers/occasionCategoryController.js
// Refactored to use OccasionService

const { getOccasionService } = require("../services/occasionService");
const occasionService = getOccasionService();

class OccasionCategoryController {

  // Create Category
  createCategory = async (req, res, next) => {
    try {
      const { isSuperAdmin, community } = req.user;

      // Authorization/Data prep
      if (isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({ success: false, message: "Community required for superadmin" });
        }
      } else {
        req.body.community = community;
      }

      const { name, description, occasionType } = req.body;
      if (!name || !occasionType) {
        return res.status(400).json({ success: false, message: "Name and OccasionType required" });
      }

      // Check existence
      const exists = await occasionService.checkCategoryNameExists(name, occasionType, req.body.community);
      if (exists) {
        return res.status(400).json({ success: false, message: "Category already exists" });
      }

      const category = await occasionService.createCategory(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  };

  // Get All
  getAllCategories = async (req, res, next) => {
    try {
      // Filter logic
      let communityId = null;
      if (req.user.isSuperAdmin) {
        if (req.query.community) communityId = req.query.community;
      } else {
        const userCommunity = req.user.community;
        communityId = userCommunity ? (userCommunity._id || userCommunity.id || userCommunity) : null;
        if (!communityId) {
          return res.status(400).json({ success: false, message: "Community information missing for user" });
        }
        communityId = String(communityId);
      }

      let docs = [];
      const { occasionType } = req.query;
      const filters = {};
      if (occasionType && occasionType !== 'undefined') filters.occasionType = occasionType;

      if (communityId) {
        docs = await occasionService.getCategoriesByCommunity(communityId, { filters });
      } else if (req.user.isSuperAdmin) {
        // Not implemented in service yet. 
        // For now return empty 
      }

      res.status(200).json({ success: true, count: docs.length, data: docs });
    } catch (err) {
      next(err);
    }
  };

  // Get One
  getCategory = async (req, res, next) => {
    try {
      const category = await occasionService.getCategoryById(req.params.id);
      if (!category) return res.status(404).json({ success: false, message: "Not found" });

      // Authorization
      if (!req.user.isSuperAdmin) {
        const catCommunity = category.community._id || category.community;
        const userCommunity = req.user.community._id || req.user.community;
        if (catCommunity.toString() !== userCommunity.toString()) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }
      }

      res.status(200).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  };

  // Update
  updateCategory = async (req, res, next) => {
    try {
      const category = await occasionService.getCategoryById(req.params.id);
      if (!category) return res.status(404).json({ success: false, message: "Not found" });

      // Authorization
      if (!req.user.isSuperAdmin) {
        const catCommunity = category.community._id || category.community;
        const userCommunity = req.user.community._id || req.user.community;
        if (catCommunity.toString() !== userCommunity.toString()) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }
      }

      // Unique check if name changes
      if (req.body.name && req.body.name !== category.name) {
        const exists = await occasionService.checkCategoryNameExists(
          req.body.name,
          req.body.occasionType || category.occasionType,
          category.community._id || category.community,
          req.params.id
        );
        if (exists) return res.status(400).json({ success: false, message: "Name exists" });
      }

      const updated = await occasionService.updateCategory(req.params.id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  // Delete
  deleteCategory = async (req, res, next) => {
    try {
      const category = await occasionService.getCategoryById(req.params.id);
      if (!category) return res.status(404).json({ success: false, message: "Not found" });

      // Authorization
      if (!req.user.isSuperAdmin) {
        const catCommunity = category.community._id || category.community;
        const userCommunity = req.user.community._id || req.user.community;
        if (catCommunity.toString() !== userCommunity.toString()) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }
      }

      await occasionService.deleteCategory(req.params.id);
      res.status(200).json({ success: true, message: "Deleted" });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new OccasionCategoryController();
