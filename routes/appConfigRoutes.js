// routes/appConfigRoutes.js
const express = require('express');
const { getAppVersion, updateAppVersion } = require('../controllers/appConfigController');
const isAuthenticated = require('../middleware/isAuthenticated');
const isSuperAdmin = require('../middleware/isSuperAdmin');

const router = express.Router();

// Public route to fetch version info (used by frontend at app launch)
router.get('/version', getAppVersion);

// Protected route to update version info (used by superadmin)
router.put('/version', isAuthenticated, isSuperAdmin, updateAppVersion);

module.exports = router;
