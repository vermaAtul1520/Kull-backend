const { signupUser, loginUser, getAdminDashboardStats, getCommunityAdminDashboardStats } = require("../controllers/authController");
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const isSuperAdmin = require("../middleware/isSuperAdmin");

const router = require("express").Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.get("/admin/dashboard-stats", isAuthenticated, isSuperAdmin, getAdminDashboardStats);
router.get("/community-admin/dashboard-stats", isAuthenticated, isSuperOrCommunityAdmin, getCommunityAdminDashboardStats);

module.exports = router;