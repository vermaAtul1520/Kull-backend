// services/sportsEventService.js - Sports Event Service

const { getSportsEventRepository } = require('../repositories/sportsEventRepository');

class SportsEventService {
    constructor() {
        this.sportsEventRepo = getSportsEventRepository();
    }

    async createSportsEvent(eventData, communityId, createdBy) {
        return this.sportsEventRepo.create({ ...eventData, communityId, createdBy });
    }

    async getSportsEventById(eventId) {
        return this.sportsEventRepo.findById(eventId);
    }

    async getSportsEventsByCommunity(communityId, options = {}) {
        return this.sportsEventRepo.findByCommunity(communityId, options);
    }

    async getUpcomingSportsEvents(communityId) {
        return this.sportsEventRepo.findUpcoming(communityId);
    }

    async getSportsEventsBySportType(communityId, sportType) {
        return this.sportsEventRepo.findBySportType(communityId, sportType);
    }

    async updateSportsEvent(eventId, updates) {
        return this.sportsEventRepo.updateById(eventId, updates);
    }

    async deleteSportsEvent(eventId) {
        return this.sportsEventRepo.deleteById(eventId);
    }

    async searchByOrganizer(communityId, organizer) {
        return this.sportsEventRepo.searchByOrganizer(communityId, organizer);
    }

    async getSportsEventStats(communityId) {
        const allEvents = await this.sportsEventRepo.findByCommunity(communityId, { filters: { isActive: true } });

        const totalEvents = allEvents.length;
        const upcomingEvents = allEvents.filter(e => e.isUpcoming).length;

        const eventTypeStats = Object.entries(allEvents.reduce((acc, e) => {
            const type = e.eventType || 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {})).map(([type, count]) => ({ _id: type, count })).sort((a, b) => b.count - a.count);

        const categoryStats = Object.entries(allEvents.reduce((acc, e) => {
            const cat = e.category || 'Unknown';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {})).map(([cat, count]) => ({ _id: cat, count })).sort((a, b) => b.count - a.count);

        return {
            totalEvents,
            upcomingEventsCount: upcomingEvents,
            eventTypeBreakdown: eventTypeStats,
            categoryBreakdown: categoryStats
        };
    }
}

let instance = null;
const getSportsEventService = () => {
    if (!instance) instance = new SportsEventService();
    return instance;
};

module.exports = { SportsEventService, getSportsEventService };
