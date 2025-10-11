// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController"); // class-based instance
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");

router.get("/pending",isAuthenticated, userController.getPendingUsers);

router.get("/city-search", isAuthenticated, userController.citySearch);

router.put("/profile", isAuthenticated, userController.updateOwnProfile);

router.put("/:userId", isAuthenticated, isSuperOrCommunityAdmin, userController.updateUser);

router.put("/:userId/assignCommunity", isAuthenticated, userController.assignCommunityToUser);

router.delete("/:userId", isAuthenticated, isSuperOrCommunityAdmin, userController.deleteUser);

module.exports = router;
