const { getAppealService } = require("../services/appealService");
const { getUserService } = require("../services/userService");
const { getCommunityService } = require("../services/communityService");

const appealService = getAppealService();
const userService = getUserService();
const communityService = getCommunityService();

class AppealController {

  // Create Appeal - Issue #23 fix
  createAppeal = async (req, res, next) => {
    try {
      // Check if user has a community
      if (!req.user.community && !req.user.isSuperAdmin) {
        return res.status(400).json({
          success: false,
          message: "You must belong to a community to submit an appeal",
        });
      }

      let communityId = req.user.community;
      let userId = req.user.id;

      // If superadmin, community must be passed explicitly
      if (req.user.isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating appeal as super admin",
          });
        }
        communityId = req.body.community;
        // user (creator) can be provided, but fallback to superadmin's own id
        userId = req.body.user || req.user.id;
      }

      // If user object is passed, extract id
      if (typeof communityId === 'object') communityId = communityId._id.toString();

      const appealData = {
        ...req.body,
        user: userId
      };

      const appeal = await appealService.createAppeal(appealData, communityId, userId);

      res.status(201).json({
        success: true,
        message: "Appeal submitted successfully",
        data: appeal
      });
    } catch (err) {
      next(err);
    }
  };

  // Get all Appeals (alias for compatibility)
  getAll = async (req, res, next) => {
    try {
      let appeals = [];
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      let total = 0;

      // Inject role-based restrictions
      const userCommId = (req.user.community?._id || req.user.community?.id || req.user.community)?.toString();
      const queryCommunity = req.query.community || req.parsedQuery?.filter?.community;
      const targetCommunityId = queryCommunity || userCommId;

      if (req.user.roleInCommunity === "admin" && req.user.community) {
        // Community admin sees all appeals in their community (or the one they requested if they have rights, but usually just their own)
        appeals = await appealService.getAppealsByCommunity(targetCommunityId, { limit, skip });
        total = await appealService.appealRepo.countByCommunity(targetCommunityId);
      } else if (!req.user.isSuperAdmin) {
        // Regular users see only their own appeals
        appeals = await appealService.getAppealsByUser(req.user.id, { limit, skip });
        total = await appealService.appealRepo.count({ user: req.user.id });
      } else {
        // Superadmin
        if (targetCommunityId) {
          appeals = await appealService.getAppealsByCommunity(targetCommunityId, { limit, skip });
          total = await appealService.appealRepo.countByCommunity(targetCommunityId);
        } else {
          // If no community specified even for superadmin, return empty or global depending on requirement.
          // For now, defaulting to an empty search if no community is provided, to prevent accidental global scans.
          // However, if they explicitly want ALL, they should probably have a way.
          // Given the context of "data leak", empty is safer.
          appeals = [];
          total = 0;
        }
      }

      // Manual Populate
      // Appeals have `user` field (author) and `community` field
      const userIds = appeals.map(a => a.user);
      const users = await userService.getManyByIds(userIds);
      const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

      const populated = appeals.map(a => ({
        ...a,
        user: userMap[a.user] ? {
          _id: userMap[a.user].id || userMap[a.user]._id,
          firstName: userMap[a.user].firstName,
          lastName: userMap[a.user].lastName,
          email: userMap[a.user].email
        } : a.user
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

  // Get single Appeal
  getAppeal = async (req, res, next) => {
    try {
      const appeal = await appealService.getAppealById(req.params.id);
      if (!appeal) return res.status(404).json({ success: false, message: "Not found" });

      // Authz check (loose for now, trusting getAll filters, but strictly: )
      // ... verify ownership or admin rights ...

      res.status(200).json({ success: true, data: appeal });
    } catch (err) {
      next(err);
    }
  };

  // Delete one community
  deleteAppeal = async (req, res, next) => {
    try {
      const success = await appealService.deleteAppeal(req.params.id);
      if (!success) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, message: "Deleted" });
    } catch (err) {
      next(err);
    }
  };

  updateAppeal = async (req, res, next) => {
    try {
      const updated = await appealService.updateAppeal(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new AppealController();
