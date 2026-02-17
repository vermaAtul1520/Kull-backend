const router = require("express").Router();
const uploadController = require("../controllers/uploadController");
const isAuthenticated = require("../middleware/isAuthenticated");

// Protected route to get presigned URL
router.post("/presigned-url", isAuthenticated, uploadController.getPresignedUrl);

module.exports = router;
