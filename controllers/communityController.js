// controllers/communityController.js
// Refactored to use CommunityService and UserService

const { getCommunityService } = require("../services/communityService");
const { getUserService } = require("../services/userService");
const emailService = require("../services/emailService");

const communityService = getCommunityService();
const userService = getUserService();

class CommunityController {

  // Create Community
  createCommunity = async (req, res, next) => {
    try {
      const { name, description, createdBy } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: "Community name is required" });
      }

      const newCommunity = await communityService.createCommunity({ name, description }, createdBy || req.user?.id);

      res.status(201).json({ success: true, message: "Community created successfully", community: newCommunity });
    } catch (err) {
      next(err);
    }
  };

  // List Communities
  listCommunities = async (req, res, next) => {
    try {
      const docs = await communityService.getAllCommunities(req.parsedQuery);
      res.status(200).json({ success: true, count: docs.length, data: docs });
    } catch (err) {
      next(err);
    }
  };

  // Get Community By ID
  getCommunityById = async (req, res, next) => {
    try {
      const doc = await communityService.getCommunityById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  };

  // Delete Community
  deleteCommunity = async (req, res, next) => {
    try {
      const success = await communityService.deleteCommunity(req.params.id);
      if (!success) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      next(err);
    }
  };

  // Update Community
  updateCommunity = async (req, res, next) => {
    try {
      const doc = await communityService.updateCommunity(req.params.id, req.body);
      if (!doc) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  };

  // Create or Update Config
  createOrUpdateConfiguration = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const updateData = req.body;

      const community = await communityService.getCommunityById(communityId);
      if (!community) return res.status(404).json({ success: false, message: "Community not found" });

      const config = await communityService.updateCommunityConfig(communityId, updateData);

      res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  };

  // Get Config
  getConfigurationByCommunityId = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const config = await communityService.getCommunityConfig(communityId);

      if (!config) return res.status(404).json({ success: false, message: "Configuration not found" });

      // Manual populate community details if needed
      if (config.community) {
        const comm = await communityService.getCommunityById(config.community);
        if (comm) config.community = comm;
      }

      res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  };

  // Delete Config
  deleteConfiguration = async (req, res, next) => {
    try {
      // Just return not implemented or success as per requirement
      // communityService config delete is implicit in deleteCommunity
      return res.status(501).json({ message: "Not implemented. Delete community to remove config." });
    } catch (err) {
      next(err);
    }
  };

  // Get Users By Community
  getUsersByCommunityId = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const { filter, sort, limit, skip, page } = req.parsedQuery || {};
      const { user: requestingUser } = req;

      // Search logic handled by UserService now
      const finalFilter = { ...filter, search: filter?.search };

      const users = await userService.searchCommunityUsers(communityId, finalFilter, { sort, limit, skip });
      const total = await userService.countCommunityUsers(communityId, finalFilter);

      // Clean up passwords
      const usersData = users.map(u => {
        // Clone
        const userObj = { ...u };
        if (userObj._doc) Object.assign(userObj, userObj._doc); // Handle mongoose doc if applicable

        // Handle plaintextpassword
        if ((requestingUser.role === "superadmin" || requestingUser.roleInCommunity === "admin") && userObj.plainTextPassword) {
          userObj.password = userObj.plainTextPassword;
        } else {
          delete userObj.password;
        }
        delete userObj.plainTextPassword;

        return userObj;
      });

      res.status(200).json({
        success: true,
        total,
        page: page || 1,
        limit: limit || 20,
        count: usersData.length,
        data: usersData
      });
    } catch (err) {
      next(err);
    }
  };

  // Get Officer
  getOfficerForCommunity = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const users = await userService.getOfficers(communityId);

      res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }

  // Get Gotra
  getGotraSubgotraByCommunityId = async (req, res, next) => {
    try {
      const { communityId } = req.params; // treating as code OR id

      // Find community by code OR id
      let community = await communityService.getCommunityByCode(communityId);
      if (!community) {
        community = await communityService.getCommunityById(communityId);
      }

      if (!community) {
        return res.status(404).json({ success: false, message: "Community not found" });
      }

      // Find configuration for this community
      const config = await communityService.getCommunityConfig(community.id || community._id);

      if (!config) {
        return res.status(404).json({ success: false, message: "Configuration not found" });
      }

      res.status(200).json({
        success: true,
        data: {
          gotra: config.gotra || []
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // Add User By Admin
  addUserByAdmin = async (req, res, next) => {
    try {
      const { user: adminUser } = req;
      const { communityId } = req.params;
      const userData = req.body;

      // Authorization
      if (adminUser.role !== "superadmin" && adminUser.roleInCommunity !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      // Delegate to UserService
      const { user: newUser, plainPassword } = await userService.createUserByAdmin(userData, adminUser, communityId);

      // Send Email
      if (newUser.email || newUser.phone) {
        // Fetch community name if possible
        const commId = newUser.community;
        const community = await communityService.getCommunityById(commId);

        if (community) {
          emailService.sendCommunityAssignmentEmail(
            newUser.email || newUser.phone,
            newUser.firstName,
            community.name,
            newUser.email || newUser.phone,
            plainPassword
          ).catch(e => console.error("Email fail", e));
        }
      }

      // Filter response
      const userResponse = { ...newUser };
      if (userResponse._doc) Object.assign(userResponse, userResponse._doc);
      delete userResponse.password;
      delete userResponse.plainTextPassword;

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: userResponse,
        credentials: {
          loginIdentifier: newUser.email || newUser.phone,
          password: plainPassword
        }
      });

    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  };
}

module.exports = new CommunityController();
