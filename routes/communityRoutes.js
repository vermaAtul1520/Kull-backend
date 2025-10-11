
const router = require("express").Router();
const communityController = require("../controllers/communityController");
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const isSuperAdmin = require("../middleware/isSuperAdmin");
const { queryParser } = require("../middleware/queryParser");
const bhajanController = require("../controllers/bhajanController");

// community
router.post("/create", communityController.createCommunity);
router.get(
  "/",
  isAuthenticated,
  isSuperAdmin, 
  queryParser({
    allowFilterFields: ["name","_id", "code", "createdBy", "createdAt"],
    allowSortFields: ["name", "code", "createdAt"],
    maxLimit: 50,
  }),
  communityController.listCommunities
);

// YouTube video info (must be before /:id route to avoid conflict)
router.get("/video-info", bhajanController.fetchYoutubeVideoInfo);

router.get(
  "/:id",
  isAuthenticated,
  isSuperAdmin,
  communityController.getCommunityById
);
router.put("/:id", isAuthenticated, isSuperAdmin, communityController.updateCommunity);
router.delete(
  "/:id",
  isAuthenticated,
  isSuperAdmin,
  communityController.deleteCommunity
);
router.get("/:communityId/users", isAuthenticated, queryParser({
  allowFilterFields: [
    "firstName", "email", "role","roleInCommunity", "status",
    "positionInCommunity","cast","cGotNo","gotra","subGotra","gender","communityStatus"
  ],
  allowSortFields: ["firstName", "email", "createdAt"],
  allowProjectFields: ["firstName", "email", "role", "createdAt"],
  maxLimit: 50
}), communityController.getUsersByCommunityId);

// Admin/SuperAdmin adds a new user to specific community with all details and sends credentials via email
router.post(
  "/:communityId/users",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  communityController.addUserByAdmin
);


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
router.get("/:communityId/users/orgofficers",isAuthenticated,communityController.getOfficerForCommunity);
router.get("/:communityId/gotraDetail", communityController.getGotraSubgotraByCommunityId);

module.exports = router;


