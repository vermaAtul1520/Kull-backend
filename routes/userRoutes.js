// routes/userRoutes.js
const express = require("express");
const router = express.Router();
// const { protect } = require("../middleware/isAuthenticated");
// const { isAuthenticated } = require('../middleware/isAuthenticated');
const { assignCommunityToUser } = require("../controllers/userController");
const isAuthenticated = require("../middleware/isAuthenticated");

router.put("/:userId/assignCommunity", isAuthenticated, assignCommunityToUser);

module.exports = router;
