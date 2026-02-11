// services/index.js - Service Layer Index
// Exports all service factory functions

const { getAuthService } = require('./authService');
const { getDashboardService } = require('./dashboardService');
const { getUserService } = require('./userService');
const { getCommunityService } = require('./communityService');
const { getPostService } = require('./postService');
const { getDonationService } = require('./donationService');
const { getNewsService } = require('./newsService');
const { getOccasionService } = require('./occasionService');
const { getFamilyService } = require('./familyService');
const { getAppealService } = require('./appealService');
const { getDukaanService } = require('./dukaanService');
const { getJobPostService } = require('./jobPostService');
const { getMeetingService } = require('./meetingService');
const { getSportsEventService } = require('./sportsEventService');
const { getEducationService } = require('./educationService');
const { getKartavyaService } = require('./kartavyaService');
const { getBhajanService } = require('./bhajanService');

module.exports = {
    // Auth & Dashboard
    getAuthService,
    getDashboardService,

    // Core entities
    getUserService,
    getCommunityService,
    getPostService,

    // Community content
    getDonationService,
    getNewsService,
    getOccasionService,
    getAppealService,
    getDukaanService,
    getJobPostService,
    getMeetingService,
    getSportsEventService,
    getEducationService,
    getKartavyaService,
    getBhajanService,

    // Relationships
    getFamilyService,
};
