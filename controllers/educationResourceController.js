const { getEducationService } = require("../services/educationService");
const { getCommunityService } = require("../services/communityService");
const { getUserService } = require("../services/userService");

const educationService = getEducationService();
const communityService = getCommunityService();
const userService = getUserService();

class EducationResourceController {

  // Create Resource
  createResource = async (req, res, next) => {
    try {
      let communityId = req.user.community;
      let createdBy = req.user.id;

      if (req.user.isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message:
              "Community is required when creating education resource as super admin",
          });
        }
        communityId = req.body.community;
        createdBy = req.body.createdBy || req.user.id;
      }

      // normalize ids
      if (typeof communityId === 'object') communityId = communityId._id.toString();

      const resourceData = {
        ...req.body,
      };

      const resource = await educationService.createResource(resourceData, communityId, createdBy);
      res.status(201).json({ success: true, data: resource });
    } catch (err) {
      next(err);
    }
  };

  // Get all Resources
  getAllResources = async (req, res, next) => {
    try {
      let resources = [];
      const page = parseInt(req.query.page) || 1;
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
        const userCommId = (req.user.community?._id || req.user.community?.id || req.user.community)?.toString();
        const targetCommunity = community || filterCommunity || userCommId;

        if (targetCommunity) {
          resources = await educationService.getResourcesByCommunity(targetCommunity, { limit, skip });
          total = await educationService.educationRepo.countByCommunity(targetCommunity);
        } else {
          resources = [];
          total = 0;
        }
      } else {
        const userCommunity = req.user.community;
        if (!userCommunity) {
          return res.status(403).json({
            success: false,
            message: "Community access is required to view educational resources",
          });
        }
        const userCommId = userCommunity._id || userCommunity.id || userCommunity;
        resources = await educationService.getResourcesByCommunity(String(userCommId), { limit, skip });
        total = await educationService.educationRepo.countByCommunity(String(userCommId));
      }

      // Populate createdBy
      const userIds = resources.map(r => r.createdBy);
      const users = await userService.getManyByIds(userIds);
      const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

      const populated = resources.map(r => ({
        ...r,
        createdBy: userMap[r.createdBy] ? {
          _id: userMap[r.createdBy].id || userMap[r.createdBy]._id,
          firstName: userMap[r.createdBy].firstName,
          lastName: userMap[r.createdBy].lastName
        } : r.createdBy
      }));

      return res.status(200).json({
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

  // Get single Resource
  getResource = async (req, res, next) => {
    try {
      const resource = await educationService.getResourceById(req.params.id);
      if (!resource) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, data: resource });
    } catch (err) {
      next(err);
    }
  };

  // Update Resource (only in own community unless superadmin)
  updateResource = async (req, res, next) => {
    try {
      const resource = await educationService.getResourceById(req.params.id);
      if (!resource) {
        return res
          .status(404)
          .json({ success: false, message: "Education Resource not found" });
      }

      if (!req.user.isSuperAdmin) {
        const resCommId = resource.communityId || resource.community;
        const userCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

        if (resCommId.toString() !== userCommId) {
          return res.status(403).json({
            success: false,
            message:
              "Not authorized to update resource outside your community",
          });
        }
      }

      const updated = await educationService.updateResource(req.params.id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  // Delete Resource (restricted same as update)
  deleteResource = async (req, res, next) => {
    try {
      const resource = await educationService.getResourceById(req.params.id);
      if (!resource) {
        return res
          .status(404)
          .json({ success: false, message: "Education Resource not found" });
      }

      if (!req.user.isSuperAdmin) {
        const resCommId = resource.communityId || resource.community;
        const userCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

        if (resCommId.toString() !== userCommId) {
          return res.status(403).json({
            success: false,
            message:
              "Not authorized to delete resource outside your community",
          });
        }
      }

      await educationService.deleteResource(req.params.id);
      res.status(200).json({ success: true, message: "Deleted" });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new EducationResourceController();
