// services/dashboardService.js - Dashboard Statistics Service
// Handles dashboard stats for both admin and community admin

const { getUserRepository } = require('../repositories/userRepository');
const { getCommunityRepository } = require('../repositories/communityRepository');
const { getPostRepository } = require('../repositories/postRepository');
const { getDonationRepository } = require('../repositories/donationRepository');
const { getNewsRepository } = require('../repositories/newsRepository');
const { getAppealRepository } = require('../repositories/appealRepository');
const { getJobPostRepository } = require('../repositories/jobPostRepository');
const { getMeetingRepository } = require('../repositories/meetingRepository');
const { getSportsEventRepository } = require('../repositories/sportsEventRepository');
const { getDukaanRepository } = require('../repositories/dukaanRepository');
const { getEducationRepository } = require('../repositories/educationRepository');
const { getKartavyaRepository } = require('../repositories/kartavyaRepository');
const { getOccasionRepository } = require('../repositories/occasionRepository');
const os = require('os');

class DashboardService {
    constructor() {
        this.userRepo = getUserRepository();
        this.communityRepo = getCommunityRepository();
        this.postRepo = getPostRepository();
        this.donationRepo = getDonationRepository();
        this.newsRepo = getNewsRepository();
        this.appealRepo = getAppealRepository();
        this.jobPostRepo = getJobPostRepository();
        this.meetingRepo = getMeetingRepository();
        this.sportsEventRepo = getSportsEventRepository();
        this.dukaanRepo = getDukaanRepository();
        this.educationRepo = getEducationRepository();
        this.kartavyaRepo = getKartavyaRepository();
        this.occasionRepo = getOccasionRepository();
    }

    /**
     * Get system health metrics
     * @returns {Object}
     */
    getSystemHealth() {
        return {
            serverStatus: 'Online',
            apiStatus: 'Operational',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                systemTotal: Math.round(os.totalmem() / 1024 / 1024),
                systemFree: Math.round(os.freemem() / 1024 / 1024),
            },
            cpu: {
                model: os.cpus()[0]?.model || 'Unknown',
                cores: os.cpus().length,
                loadAverage: os.loadavg(),
            },
            platform: {
                type: os.type(),
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
            },
        };
    }

    /**
     * Get super admin dashboard statistics
     * @returns {Promise<Object>}
     */
    async getAdminDashboardStats() {
        const startTime = Date.now();
        const systemHealth = this.getSystemHealth();

        // Parallel count queries
        const [
            totalUsers,
            totalCommunities,
            pendingUsers,
            approvedUsers,
            rejectedUsers,
        ] = await Promise.all([
            this.userRepo.count({}),
            this.communityRepo.count({}),
            this.userRepo.count({ communityStatus: 'pending' }),
            this.userRepo.count({ communityStatus: 'approved' }),
            this.userRepo.count({ communityStatus: 'rejected' }),
        ]);

        // Content counts
        const [
            totalPosts,
            totalNews,
            totalAppeals,
            totalJobPosts,
            totalMeetings,
            totalSportsEvents,
            totalDonations,
            totalDukaans,
            totalEducationResources,
            totalKartavya,
            totalOccasions,
        ] = await Promise.all([
            this.postRepo.count({}),
            this.newsRepo.count({}),
            this.appealRepo.count({}),
            this.jobPostRepo.count({}),
            this.meetingRepo.count({}),
            this.sportsEventRepo.count({}),
            this.donationRepo.count({}),
            this.dukaanRepo.count({}),
            this.educationRepo.count({}),
            this.kartavyaRepo.count({}),
            this.occasionRepo.count({}),
        ]);

        const pendingAppeals = await this.appealRepo.count({ status: 'submitted' });

        // Recent activity
        const [recentUsers, recentCommunities] = await Promise.all([
            this.userRepo.find({}, { limit: 5, sort: { createdAt: -1 } }),
            this.communityRepo.find({}, { limit: 5, sort: { createdAt: -1 } }),
        ]);

        systemHealth.responseTime = `${Date.now() - startTime}ms`;

        return {
            systemHealth,
            overview: {
                totalUsers,
                totalCommunities,
                pendingUsers,
                approvedUsers,
                rejectedUsers,
            },
            userStats: {
                total: totalUsers,
                statusBreakdown: { pending: pendingUsers, approved: approvedUsers, rejected: rejectedUsers },
            },
            contentStats: {
                totalPosts,
                totalNews,
                totalJobPosts,
                totalMeetings,
                totalSportsEvents,
                totalDukaans,
                totalEducationResources,
                totalKartavya,
                totalOccasions,
                totalDonations,
            },
            appealStats: {
                total: totalAppeals,
                pending: pendingAppeals,
                resolved: totalAppeals - pendingAppeals,
            },
            recentActivity: { recentUsers, recentCommunities },
        };
    }

    /**
     * Get community admin dashboard statistics
     * @param {string} communityId 
     * @returns {Promise<Object>}
     */
    async getCommunityDashboardStats(communityId) {
        const startTime = Date.now();
        const systemHealth = {
            serverStatus: 'Online',
            apiStatus: 'Operational',
            timestamp: new Date().toISOString(),
        };

        // User counts
        const [
            totalUsers,
            pendingUsers,
            approvedUsers,
            rejectedUsers,
        ] = await Promise.all([
            this.userRepo.countByCommunity(communityId),
            this.userRepo.countByCommunity(communityId, { communityStatus: 'pending' }),
            this.userRepo.countByCommunity(communityId, { communityStatus: 'approved' }),
            this.userRepo.countByCommunity(communityId, { communityStatus: 'rejected' }),
        ]);

        // Content counts
        const [
            totalPosts,
            totalNews,
            totalAppeals,
            pendingAppeals,
            totalJobPosts,
            totalMeetings,
            totalSportsEvents,
            totalDonations,
            totalDukaans,
            totalEducationResources,
            totalKartavya,
            totalOccasions,
        ] = await Promise.all([
            this.postRepo.count({ community: communityId }),
            this.newsRepo.countByCommunity(communityId),
            this.appealRepo.countByCommunity(communityId),
            this.appealRepo.countByCommunity(communityId, { status: 'submitted' }),
            this.jobPostRepo.countByCommunity(communityId),
            this.meetingRepo.countByCommunity(communityId),
            this.sportsEventRepo.countByCommunity(communityId),
            this.donationRepo.countByCommunity(communityId),
            this.dukaanRepo.countByCommunity(communityId),
            this.educationRepo.countByCommunity(communityId),
            this.kartavyaRepo.countByCommunity(communityId),
            this.occasionRepo.countByCommunity(communityId),
        ]);

        // Community info and recent users
        const [communityInfo, recentUsers] = await Promise.all([
            this.communityRepo.findById(communityId),
            this.userRepo.findByCommunity(communityId, { limit: 5 }),
        ]);

        systemHealth.responseTime = `${Date.now() - startTime}ms`;

        return {
            communityInfo,
            systemHealth,
            overview: { totalUsers, pendingUsers, approvedUsers, rejectedUsers },
            userStats: {
                total: totalUsers,
                statusBreakdown: { pending: pendingUsers, approved: approvedUsers, rejected: rejectedUsers },
            },
            contentStats: {
                totalPosts,
                totalNews,
                totalJobPosts,
                totalMeetings,
                totalSportsEvents,
                totalDukaans,
                totalEducationResources,
                totalKartavya,
                totalOccasions,
                totalDonations,
            },
            appealStats: {
                total: totalAppeals,
                pending: pendingAppeals,
                resolved: totalAppeals - pendingAppeals,
            },
            recentActivity: { recentUsers },
        };
    }
}

let dashboardServiceInstance = null;

const getDashboardService = () => {
    if (!dashboardServiceInstance) {
        dashboardServiceInstance = new DashboardService();
    }
    return dashboardServiceInstance;
};

module.exports = { DashboardService, getDashboardService };
