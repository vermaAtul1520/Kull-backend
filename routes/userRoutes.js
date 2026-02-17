// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController"); // class-based instance
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const isSuperAdmin = require("../middleware/isSuperAdmin");
const { queryParser } = require("../middleware/queryParser");

router.get(
    "/",
    isAuthenticated,
    isSuperAdmin,
    queryParser({
        allowFilterFields: ["firstName", "email", "role", "communityStatus", "community"],
        allowSortFields: ["firstName", "email", "createdAt"],
        maxLimit: 100
    }),
    userController.listAllUsers
);

router.get("/pending", isAuthenticated, userController.getPendingUsers);

router.get("/city-search", isAuthenticated, userController.citySearch);

// Family tree search (Issue #17 fix)
router.get("/family-tree/search", isAuthenticated, userController.familyTreeSearch);

// Profile Routes
router.get("/profile", isAuthenticated, userController.getOwnProfile);
router.put("/profile", isAuthenticated, userController.updateOwnProfile);

router.put("/:userId", isAuthenticated, isSuperOrCommunityAdmin, userController.updateUser);

router.put("/:userId/assignCommunity", isAuthenticated, userController.assignCommunityToUser);

router.delete("/:userId", isAuthenticated, isSuperOrCommunityAdmin, userController.deleteUser);

module.exports = router;
