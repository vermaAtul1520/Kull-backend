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
      // Extract and validate new fields
      const {
        shopName,
        description,
        banner,
        url,
        isActive = true,
        ...otherFields
      } = req.body;

      // Validate required fields
      if (!shopName) {
        return res.status(400).json({
          success: false,
          message: "Dukaan name is required",
        });
      }

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

      // Prepare dukaan data with new fields
      const dukaanData = {
        ...req.body,
        shopName: shopName.trim(),
        description: description?.trim(),
        banner: banner?.trim(),
        url: url?.trim(),
        isActive,
      };

      const dukaan = await this.model.create(dukaanData);
      res.status(201).json({
        success: true,
        message: "Dukaan created successfully",
        data: dukaan
      });
    } catch (err) {
      next(err);
    }
  };

  // Update Dukaan
  updateDukaan = async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        shopName,
        description,
        banner,
        url,
        isActive,
      } = req.body;

      // Find the dukaan first
      const existingDukaan = await this.model.findById(id);
      if (!existingDukaan) {
        return res.status(404).json({
          success: false,
          message: "Dukaan not found",
        });
      }

      // Check permissions
      if (!req.user.isSuperAdmin &&
          existingDukaan.community.toString() !== req.user.community.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only update dukaans in your community",
        });
      }

      // Prepare update data
      const updateData = {};
      if (shopName !== undefined) updateData.shopName = shopName.trim();
      if (description !== undefined) updateData.description = description?.trim();
      if (banner !== undefined) updateData.banner = banner?.trim();
      if (url !== undefined) updateData.url = url?.trim();
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedDukaan = await this.model.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: "Dukaan updated successfully",
        data: updatedDukaan,
      });
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
