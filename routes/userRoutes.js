// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { assignCommunityToUser } = require("../controllers/userController");

router.put("/:userId/assignCommunity", protect, assignCommunityToUser);

module.exports = router;
