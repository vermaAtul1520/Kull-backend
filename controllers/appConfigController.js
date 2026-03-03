// controllers/appConfigController.js
const { AppConfigRepository } = require('../repositories/appConfigRepository');

const appConfigRepo = new AppConfigRepository();

// Default hardcoded value in case nothing is in the DB
const DEFAULT_VERSION_CONFIG = {
    android: {
        latestVersion: "1.0.0",
        minRequiredVersion: "1.0.0",
        storeUrl: "market://details?id=com.yourapp.bundle",
        releaseNotes: "Initial app configuration."
    },
    ios: {
        latestVersion: "1.0.0",
        minRequiredVersion: "1.0.0",
        storeUrl: "itms-apps://itunes.apple.com/app/idYOUR_APP_ID",
        releaseNotes: "Initial app configuration."
    }
};

/**
 * @desc Get the version configuration
 * @route GET /api/app-config/version
 * @access Public
 */
exports.getAppVersion = async (req, res, next) => {
    try {
        let config = await appConfigRepo.findByKey('version_config');

        if (!config) {
            // Seed missing config gracefully
            config = await appConfigRepo.updateByKey('version_config', DEFAULT_VERSION_CONFIG);
        }

        res.status(200).json({
            success: true,
            data: config.value
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc Update the version configuration
 * @route PUT /api/app-config/version
 * @access Private/Superadmin
 */
exports.updateAppVersion = async (req, res, next) => {
    try {
        const { android, ios } = req.body;

        if (!android || !ios) {
            return res.status(400).json({
                success: false,
                message: "Must provide both android and ios configurations."
            });
        }

        const newConfigValue = { android, ios };
        const updatedConfig = await appConfigRepo.updateByKey('version_config', newConfigValue);

        res.status(200).json({
            success: true,
            message: "App version configuration updated successfully",
            data: updatedConfig.value
        });
    } catch (error) {
        next(error);
    }
};
