// repositories/index.js - Repository Factory
// Central export for all repositories

const { getUserRepository } = require('./userRepository');
const { getCommunityRepository } = require('./communityRepository');
const { getCommunityConfigRepository } = require('./communityConfigRepository');
const { getPostRepository } = require('./postRepository');
const { getDonationRepository } = require('./donationRepository');
const { getNewsRepository } = require('./newsRepository');
const { getOccasionRepository } = require('./occasionRepository');
const { getOccasionCategoryRepository } = require('./occasionCategoryRepository');
const { getAppealRepository } = require('./appealRepository');
const { getDukaanRepository } = require('./dukaanRepository');
const { getEducationRepository } = require('./educationRepository');
const { getJobPostRepository } = require('./jobPostRepository');
const { getKartavyaRepository } = require('./kartavyaRepository');
const { getMeetingRepository } = require('./meetingRepository');
const { getSportsEventRepository } = require('./sportsEventRepository');
const { getBhajanRepository } = require('./bhajanRepository');
const { getFamilyRepository } = require('./familyRepository');
const { getCommentRepository } = require('./commentRepository');
const { getLikeRepository } = require('./likeRepository');

module.exports = {
    // User & Auth
    getUserRepository,

    // Community
    getCommunityRepository,
    getCommunityConfigRepository,

    // Content
    getPostRepository,
    getCommentRepository,
    getLikeRepository,
    getNewsRepository,
    getBhajanRepository,

    // Events & Activities
    getOccasionRepository,
    getOccasionCategoryRepository,
    getMeetingRepository,
    getSportsEventRepository,

    // Community Features
    getDonationRepository,
    getAppealRepository,
    getDukaanRepository,
    getEducationRepository,
    getJobPostRepository,
    getKartavyaRepository,

    // Family
    getFamilyRepository,
};
