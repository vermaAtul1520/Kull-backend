const { getDukaanService } = require("../services/dukaanService");
const { getCommunityService } = require("../services/communityService");
const { getUserService } = require("../services/userService");

const dukaanService = getDukaanService();
const communityService = getCommunityService();
const userService = getUserService();

class DukaanController {

  // Create Dukaan
  createDukaan = async (req, res, next) => {
    try {
      const {
        shopName,
        description,
        banner,
        url,
        isActive = true
      } = req.body;

      if (!shopName) {
        return res.status(400).json({
          success: false,
          message: "Dukaan name is required",
        });
      }

      let communityId = req.user.community;
      let ownerId = req.user.id;

      if (req.user.isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating Dukaan as super admin",
          });
        }
        communityId = req.body.community;
        ownerId = req.body.createdBy || req.user.id;
      }

      // normalize ids
      if (typeof communityId === 'object') communityId = communityId._id.toString();

      // Prepare dukaan data with new fields
      const dukaanData = {
        ...req.body,
        shopName: shopName.trim(),
        description: description?.trim(),
        banner: banner?.trim(),
        url: url?.trim(),
        isActive,
      };

      const dukaan = await dukaanService.createDukaan(dukaanData, communityId, ownerId);
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
      const { shopName, description, banner, url, isActive } = req.body;

      const existingDukaan = await dukaanService.getDukaanById(id);
      if (!existingDukaan) {
        return res.status(404).json({ success: false, message: "Dukaan not found" });
      }

      // Check permissions
      // assuming community is string in dynamodb or object in mongo
      const dukaanCommId = existingDukaan.communityId || existingDukaan.community;
      const userCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

      if (!req.user.isSuperAdmin && dukaanCommId.toString() !== userCommId) {
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

      // Also allow updating other fields from body if needed, but keeping it strict as per original logic?
      // Original logic blindly merged others? No, it extracted specific fields in 'create' but 'update' only extracted specific fields.
      // So strict update is good.

      const updatedDukaan = await dukaanService.updateDukaan(id, updateData);

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
      let dukaans = [];
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      let total = 0;

      if (req.user.isSuperAdmin) {
        // Parse filter query param
        let filterCommunity = null;
        if (req.query.filter) {
          try {
            const parsedFilter = JSON.parse(req.query.filter);
            if (parsedFilter.community) {
              filterCommunity = parsedFilter.community;
            }
          } catch (e) {
            console.error("Failed to parse filter query param:", e);
          }
        }

        const { community } = req.query;
        let targetCommunity = community || filterCommunity;

        // Force default to user's community if no specific community is filtered
        if (!targetCommunity) {
          targetCommunity = userCommId;
        }

        if (targetCommunity) {
          dukaans = await dukaanService.getDukaansByCommunity(targetCommunity, { limit, skip });
          total = await dukaanService.dukaanRepo.countByCommunity(targetCommunity);
        } else {
          dukaans = [];
          total = 0;
        }
      } else {
        const userCommunity = req.user.community;
        if (!userCommunity) {
          return res.status(403).json({
            success: false,
            message: "Community access is required to view dukaans",
          });
        }
        const userCommId = userCommunity._id || userCommunity.id || userCommunity;
        dukaans = await dukaanService.getDukaansByCommunity(String(userCommId), { limit, skip });
        total = await dukaanService.dukaanRepo.countByCommunity(String(userCommId));
      }

      // Populate Owner/Community?
      // Dukaans have 'owner' field? Original code: req.body.createdBy = req.user.id
      // Repository uses 'owner'.

      const ownerIds = dukaans.map(d => d.owner || d.createdBy);
      const users = await userService.getManyByIds(ownerIds);
      const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

      const populated = dukaans.map(d => ({
        ...d,
        owner: userMap[d.owner || d.createdBy] ? {
          _id: userMap[d.owner || d.createdBy].id || userMap[d.owner || d.createdBy]._id,
          firstName: userMap[d.owner || d.createdBy].firstName,
          lastName: userMap[d.owner || d.createdBy].lastName
        } : (d.owner || d.createdBy)
      }));

      res.status(200).json({
        success: true,
        total,
        page,
        limit,
        count: populated.length,
        data: populated
      });
    } catch (err) {
      next(err);
    }
  };

  // Get single Dukaan
  getDukaan = async (req, res, next) => {
    try {
      const dukaan = await dukaanService.getDukaanById(req.params.id);
      if (!dukaan) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, data: dukaan });
    } catch (err) {
      next(err);
    }
  };

  // Delete Dukaan
  deleteDukaan = async (req, res, next) => {
    try {
      const dukaan = await dukaanService.getDukaanById(req.params.id);
      if (!dukaan) return res.status(404).json({ success: false, message: "Not found" });

      if (!req.user.isSuperAdmin) {
        const dukaanCommId = dukaan.communityId || dukaan.community;
        const userCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

        if (dukaanCommId.toString() !== userCommId) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to delete Dukaan outside your community",
          });
        }
      }

      await dukaanService.deleteDukaan(req.params.id);
      res.status(200).json({ success: true, message: "Deleted" });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new DukaanController();
