
const router = require("express").Router();
const communityController = require("../controllers/communityController");
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const { queryParser } = require("../middleware/queryParser");
const bhajanController = require("../controllers/bhajanController");

// community
router.post("/create", communityController.createCommunity);
router.get("/:communityId/users", isAuthenticated, queryParser({
  allowFilterFields: ["firstName", "email", "role", "status"],
  allowSortFields: ["firstName", "email", "createdAt"],
  allowProjectFields: ["firstName", "email", "role", "createdAt"],
  maxLimit: 50
}), communityController.getUsersByCommunityId);

// community configuration
router.post("/:communityId/configuration", isAuthenticated, isSuperOrCommunityAdmin, communityController.createOrUpdateConfiguration);
router.get("/:communityId/configuration", isAuthenticated, communityController.getConfigurationByCommunityId);
router.delete("/:communityId/configuration", isAuthenticated, isSuperOrCommunityAdmin, communityController.deleteConfiguration);



// Bhajans
router.post("/:communityId/bhajans", isAuthenticated, isSuperOrCommunityAdmin, bhajanController.createBhajan);
router.get("/:communityId/bhajans", isAuthenticated, queryParser({
  allowFilterFields: ["title","artist","category"],
  allowSortFields: ["title","artist","views","createdAt"],
  allowProjectFields: ["title","artist","category","views","createdAt"],
  maxLimit: 50
}), bhajanController.getBhajansByCommunity);
router.get("/bhajans/:id", isAuthenticated, bhajanController.getBhajanById);
router.put("/bhajans/:id", isAuthenticated, bhajanController.updateBhajan);
router.delete("/bhajans/:id", isAuthenticated, isSuperOrCommunityAdmin, bhajanController.deleteBhajan);

module.exports = router;

