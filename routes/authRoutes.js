const { signupUser, loginUser, getAdminDashboardStats } = require("../controllers/authController");

const router = require("express").Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.get("/admin/dashboard-stats", getAdminDashboardStats);

module.exports = router;