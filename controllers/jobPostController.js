const { getJobPostService } = require("../services/jobPostService");
const { getCommunityService } = require("../services/communityService");
const { getUserService } = require("../services/userService");

const jobPostService = getJobPostService();
const communityService = getCommunityService();
const userService = getUserService();

class JobPostController {

  // Create JobPost
  createJobPost = async (req, res, next) => {
    try {
      let communityId = req.user.community;
      let createdBy = req.user.id;

      if (req.user.isSuperAdmin) {
        // superadmin must explicitly pass community
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating JobPost as super admin",
          });
        }
        communityId = req.body.community;
        createdBy = req.body.createdBy || req.user.id;
      }

      // normalize ids
      if (typeof communityId === 'object') communityId = communityId._id.toString();

      const jobData = { ...req.body };

      const jobPost = await jobPostService.createJobPost(jobData, communityId, createdBy);
      res.status(201).json({ success: true, data: jobPost });
    } catch (err) {
      next(err);
    }
  };

  // Get all JobPosts
  getAllJobPosts = async (req, res, next) => {
    try {
      let jobPosts = [];
      const limit = parseInt(req.query.limit) || 20;

      if (req.user.isSuperAdmin && !req.user.isCommunityAdmin) {
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
        const targetCommunity = community || filterCommunity;

        if (targetCommunity) {
          jobPosts = await jobPostService.getJobPostsByCommunity(targetCommunity, { limit });
        } else {
          jobPosts = [];
        }
      } else {
        // Regular users see all job posts in their community
        // Community Admin too
        const userCommunity = req.user.community;
        if (!userCommunity) {
          return res.status(403).json({ success: false, message: "Community access required" });
        }
        const userCommId = userCommunity._id || userCommunity.id || userCommunity;
        jobPosts = await jobPostService.getJobPostsByCommunity(String(userCommId), { limit });
      }

      // Populate postedBy (createdBy)
      // JobPostService uses 'postedBy' field in create: { ...jobData, communityId, postedBy: posterId }
      const userIds = jobPosts.map(j => j.postedBy || j.createdBy);
      const users = await userService.getManyByIds(userIds);
      const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

      const populated = jobPosts.map(j => ({
        ...j,
        postedBy: userMap[j.postedBy || j.createdBy] ? {
          _id: userMap[j.postedBy || j.createdBy].id || userMap[j.postedBy || j.createdBy]._id,
          firstName: userMap[j.postedBy || j.createdBy].firstName,
          lastName: userMap[j.postedBy || j.createdBy].lastName
        } : (j.postedBy || j.createdBy)
      }));

      return res.status(200).json({ success: true, count: populated.length, data: populated });
    } catch (err) {
      next(err);
    }
  };

  // Get single JobPost
  getJobPost = async (req, res, next) => {
    try {
      const jobPost = await jobPostService.getJobPostById(req.params.id);
      if (!jobPost) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, data: jobPost });
    } catch (err) {
      next(err);
    }
  };

  // Update JobPost
  updateJobPost = async (req, res, next) => {
    try {
      const jobPost = await jobPostService.getJobPostById(req.params.id);
      if (!jobPost) {
        return res.status(404).json({ success: false, message: "JobPost not found" });
      }

      // Restriction logic
      if (!req.user.isSuperAdmin) {
        const postCommId = jobPost.communityId || jobPost.community;
        const userCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

        if (postCommId.toString() !== userCommId) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to update JobPost outside your community",
          });
        }
      }

      const updated = await jobPostService.updateJobPost(req.params.id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  // Delete JobPost
  deleteJobPost = async (req, res, next) => {
    try {
      const jobPost = await jobPostService.getJobPostById(req.params.id);
      if (!jobPost) {
        return res.status(404).json({ success: false, message: "JobPost not found" });
      }

      // Restriction logic
      if (!req.user.isSuperAdmin) {
        const postCommId = jobPost.communityId || jobPost.community;
        const userCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

        if (postCommId.toString() !== userCommId) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to delete JobPost outside your community",
          });
        }
      }

      await jobPostService.deleteJobPost(req.params.id);
      res.status(200).json({ success: true, message: "Deleted" });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new JobPostController();
