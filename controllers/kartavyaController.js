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
      const limit = parseInt(req.query.limit) || 20;

      if (req.user.isSuperAdmin && !req.user.isCommunityAdmin) {
        const { community } = req.query;
        if (community) {
          kartavyas = await kartavyaService.getKartavyaByCommunity(community, { limit });
        } else {
          kartavyas = [];
        }
      } else {
        const userCommunity = req.user.community;
        if (!userCommunity) {
          return res.status(403).json({ success: false, message: "Community access required" });
        }
        const userCommId = userCommunity._id || userCommunity.id || userCommunity;
        kartavyas = await kartavyaService.getKartavyaByCommunity(String(userCommId), { limit });
      }

      // Populate createdBy
      const userIds = kartavyas.map(k => k.createdBy);
      const users = await userService.getManyByIds(userIds);
      const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

      const populated = kartavyas.map(k => ({
        ...k,
        createdBy: userMap[k.createdBy] ? {
          _id: userMap[k.createdBy].id || userMap[k.createdBy]._id,
          firstName: userMap[k.createdBy].firstName,
          lastName: userMap[k.createdBy].lastName
        } : k.createdBy
      }));

      return res.status(200).json({ success: true, count: populated.length, data: populated });
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

      const updated = await kartavyaService.updateKartavya(req.params.id, req.body);
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
