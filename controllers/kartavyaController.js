const { getKartavyaService } = require("../services/kartavyaService");
const { getCommunityService } = require("../services/communityService");
const { getUserService } = require("../services/userService");

const kartavyaService = getKartavyaService();
const communityService = getCommunityService();
const userService = getUserService();

class KartavyaController {

  // Create Kartavya
  createKartavya = async (req, res, next) => {
    try {
      let communityId = req.user.community;
      let createdBy = req.user.id;

      if (req.user.isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating Kartavya as super admin",
          });
        }
        communityId = req.body.community;
        createdBy = req.body.createdBy || req.user.id;
      }

      // normalize ids
      if (typeof communityId === 'object') communityId = communityId._id.toString();

      const kartavya = await kartavyaService.createKartavya(req.body, communityId, createdBy);
      res.status(201).json({ success: true, data: kartavya });
    } catch (err) {
      next(err);
    }
  };

  // Get all Kartavyas
  getAllKartavyas = async (req, res, next) => {
    try {
      let kartavyas = [];
      const parsedFilter = req.parsedQuery?.filter || {};
      const queryObj = { ...req.query, ...parsedFilter };

      const { sort, limit, skip, page } = req.parsedQuery || {};
      const queryLimit = limit || 20;
      const querySkip = skip || 0;

      // Ensure 'filter' for the repository contains the correct category logic
      const filter = { ...parsedFilter };

      const { category, categoryId } = queryObj;
      const finalCategoryId = categoryId || category;
      if (finalCategoryId && finalCategoryId !== 'undefined') {
        filter.category = { $regex: finalCategoryId, $options: 'i' };
        // In case categoryId was used but 'category' is the DB field
        if (filter.categoryId) delete filter.categoryId;
      }

      let total = 0;
      if (req.user.isSuperAdmin && !req.user.isCommunityAdmin) {
        const community = queryObj.community;
        const userCommId = (req.user.community?._id || req.user.community?.id || req.user.community)?.toString();
        const targetCommunity = community || userCommId;

        if (targetCommunity) {
          kartavyas = await kartavyaService.getKartavyaByCommunity(targetCommunity, { limit: queryLimit, skip: querySkip, filters: filter });
          total = await kartavyaService.kartavyaRepo.countByCommunity(targetCommunity, filter);
        } else {
          kartavyas = [];
          total = 0;
        }
      } else {
        const userCommunity = req.user.community;
        if (!userCommunity) {
          return res.status(403).json({ success: false, message: "Community access required" });
        }
        const userCommId = userCommunity._id || userCommunity.id || userCommunity;
        kartavyas = await kartavyaService.getKartavyaByCommunity(String(userCommId), { limit: queryLimit, skip: querySkip, filters: filter });
        total = await kartavyaService.kartavyaRepo.countByCommunity(String(userCommId), filter);
      }

      // Populate createdBy and Community
      const userIds = [...new Set(kartavyas.map(k => String(k.createdBy || '')))].filter(id => id && id.length > 5);
      const communityIds = [...new Set(kartavyas.map(k => String(k.communityId || k.community || '')))].filter(id => id && id.length > 5);

      const [users, communities] = await Promise.all([
        userService.getManyByIds(userIds),
        communityService.getManyCommunitiesByIds(communityIds)
      ]);

      const userMap = users.reduce((acc, u) => ({ ...acc, [String(u.id || u._id)]: u }), {});
      const communityMap = communities.reduce((acc, c) => ({ ...acc, [String(c.id || c._id)]: c }), {});

      const populated = kartavyas.map(k => {
        const createdByStr = String(k.createdBy || '');
        const communityIdStr = String(k.communityId || k.community || '');

        return {
          ...k,
          createdBy: userMap[createdByStr] ? {
            _id: userMap[createdByStr].id || userMap[createdByStr]._id,
            firstName: userMap[createdByStr].firstName,
            lastName: userMap[createdByStr].lastName
          } : k.createdBy,
          community: communityMap[communityIdStr] ? {
            _id: communityMap[communityIdStr].id || communityMap[communityIdStr]._id,
            name: communityMap[communityIdStr].name
          } : k.community
        };
      });

      return res.status(200).json({
        success: true,
        total,
        page: parseInt(page) || 1,
        limit: queryLimit,
        count: populated.length,
        data: populated
      });
    } catch (err) {
      next(err);
    }
  };

  // Get single Kartavya
  getKartavya = async (req, res, next) => {
    try {
      const kartavya = await kartavyaService.getKartavyaById(req.params.id);
      if (!kartavya) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, data: kartavya });
    } catch (err) {
      next(err);
    }
  };

  // Update Kartavya
  updateKartavya = async (req, res, next) => {
    try {
      const kartavya = await kartavyaService.getKartavyaById(req.params.id);
      if (!kartavya) {
        return res.status(404).json({ success: false, message: "Kartavya not found" });
      }

      if (!req.user.isSuperAdmin) {
        const kCommId = kartavya.communityId || kartavya.community;
        const uCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

        if (kCommId.toString() !== uCommId) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to update Kartavya outside your community",
          });
        }
      }

      // Sanitize updates
      const allowedUpdates = ["title", "description", "category", "filetype", "language", "url", "thumbnailUrl"];
      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      const updated = await kartavyaService.updateKartavya(req.params.id, updates);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  // Delete Kartavya
  deleteKartavya = async (req, res, next) => {
    try {
      const kartavya = await kartavyaService.getKartavyaById(req.params.id);
      if (!kartavya) {
        return res.status(404).json({ success: false, message: "Kartavya not found" });
      }

      if (!req.user.isSuperAdmin) {
        const kCommId = kartavya.communityId || kartavya.community;
        const uCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

        if (kCommId.toString() !== uCommId) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to delete Kartavya outside your community",
          });
        }
      }

      await kartavyaService.deleteKartavya(req.params.id);
      res.status(200).json({ success: true, message: "Deleted" });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new KartavyaController();
