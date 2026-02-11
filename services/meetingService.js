// services/meetingService.js - Meeting Service

const { getMeetingRepository } = require('../repositories/meetingRepository');

class MeetingService {
    constructor() {
        this.meetingRepo = getMeetingRepository();
    }

    async createMeeting(meetingData, communityId, createdBy) {
        return this.meetingRepo.create({ ...meetingData, communityId, createdBy });
    }

    async getMeetingById(meetingId) {
        return this.meetingRepo.findById(meetingId);
    }

    async getMeetingsByCommunity(communityId, options = {}) {
        return this.meetingRepo.findByCommunity(communityId, options);
    }

    async getUpcomingMeetings(communityId) {
        return this.meetingRepo.findUpcoming(communityId);
    }

    async getPastMeetings(communityId) {
        return this.meetingRepo.findPast(communityId);
    }

    async updateMeeting(meetingId, updates) {
        return this.meetingRepo.updateById(meetingId, updates);
    }

    async deleteMeeting(meetingId) {
        return this.meetingRepo.deleteById(meetingId);
    }

    async searchByOrganizer(communityId, organizer) {
        return this.meetingRepo.searchByOrganizer(communityId, organizer);
    }

    async getMeetingStats(communityId) {
        // Fetch all active meetings for community
        // Optimized: Ideally use count() if supported, but we need aggregation.
        // For DynamoDB, we fetch all (projection limited) and aggregate.
        // Or if 'findByCommunity' supports basic list.
        const allMeetings = await this.meetingRepo.findByCommunity(communityId, { filters: { isActive: true } });

        const totalMeetings = allMeetings.length;

        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

        const upcomingCount = allMeetings.filter(m => {
            if (m.date > currentDate) return true;
            if (m.date === currentDate && m.time >= currentTime) return true;
            return false;
        }).length;

        // Group by documentType
        const documentTypeStats = Object.entries(allMeetings.reduce((acc, m) => {
            const type = m.documentType || 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {})).map(([type, count]) => ({ _id: type, count })).sort((a, b) => b.count - a.count);

        // Group by type (fileType)
        const typeStats = Object.entries(allMeetings.reduce((acc, m) => {
            const type = m.type || 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {})).map(([type, count]) => ({ _id: type, count })).sort((a, b) => b.count - a.count);

        return {
            totalMeetings,
            upcomingMeetingsCount: upcomingCount,
            documentTypeBreakdown: documentTypeStats,
            fileTypeBreakdown: typeStats
        };
    }
}

let instance = null;
const getMeetingService = () => {
    if (!instance) instance = new MeetingService();
    return instance;
};

module.exports = { MeetingService, getMeetingService };
