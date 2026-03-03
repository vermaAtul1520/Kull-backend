const router = require("express").Router();
const uploadController = require("../controllers/uploadController");
const isAuthenticated = require("../middleware/isAuthenticated");

// Protected route to get presigned URL
router.post("/presigned-url", isAuthenticated, uploadController.getPresignedUrl);

// Protected route to get multiple presigned URLs
router.post("/presigned-urls/bulk", isAuthenticated, uploadController.getBulkPresignedUrls);

module.exports = router;
