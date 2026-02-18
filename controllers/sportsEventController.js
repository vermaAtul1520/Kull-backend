const { getSportsEventService } = require("../services/sportsEventService");
const { getCommunityService } = require("../services/communityService");
const { getUserService } = require("../services/userService");

const sportsEventService = getSportsEventService();
const communityService = getCommunityService();
const userService = getUserService();

class SportsEventController {

    // Create SportsEvent
    createSportsEvent = async (req, res, next) => {
        try {
            let communityId = req.user.community;
            let createdBy = req.user.id;

            if (req.user.isSuperAdmin) {
                // superadmin must explicitly pass community
                if (!req.body.community) {
                    return res.status(400).json({
                        success: false,
                        message: "Community is required when creating SportsEvent as super admin",
                    });
                }
                communityId = req.body.community;
                createdBy = req.body.createdBy || req.user.id;
            } else {
                // community admin or normal user
                if (!req.user.community) {
                    return res.status(400).json({
                        success: false,
                        message: "User must be assigned to a community to create sports events",
                    });
                }
            }

            if (typeof communityId === 'object') communityId = communityId._id.toString();

            const sportsEvent = await sportsEventService.createSportsEvent(req.body, communityId, createdBy);

            res.status(201).json({ success: true, data: sportsEvent });
        } catch (err) {
            next(err);
        }
    };

    // Get all SportsEvents
    getAllSportsEvents = async (req, res, next) => {
        try {
            let events = [];
            const limit = parseInt(req.query.limit) || 20;

            if (!req.user.community && !req.user.isSuperAdmin) {
                return res.status(403).json({ success: false, message: "Community access required" });
            }

            let commId = req.user.community;

            // Extract from parsedQuery (populated by middleware) or manual query
            const parsedCommunity = req.parsedQuery?.filter?.community;
            let filterCommunity = null;

            if (req.query.filter) {
                try {
                    const parsed = JSON.parse(req.query.filter);
                    filterCommunity = parsed.community;
                } catch (e) { }
            }

            if (req.user.isSuperAdmin) {
                if (req.query.community) {
                    commId = req.query.community;
                } else if (parsedCommunity) {
                    commId = parsedCommunity;
                } else if (filterCommunity) {
                    commId = filterCommunity;
                } else {
                    return res.status(200).json({ success: true, count: 0, data: [] });
                }
            }

            if (typeof commId === 'object') commId = commId._id.toString();

            events = await sportsEventService.getSportsEventsByCommunity(commId, { limit });

            // Convert to objects and add attachment alias for UI
            events = events.map(e => {
                const obj = e.toObject ? e.toObject() : e;
                if (obj.url && !obj.attachment) obj.attachment = obj.url;
                return obj;
            });

            // Populate
            await this.populateEvents(events);

            res.status(200).json({ success: true, count: events.length, data: events });
        } catch (err) {
            next(err);
        }
    };

    // Helper to populate
    async populateEvents(events) {
        if (!events || events.length === 0) return;
        const userIds = events.map(e => e.createdBy).filter(id => id);

        const users = await userService.getManyByIds(userIds);
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

        events.forEach(e => {
            if (e.createdBy && userMap[e.createdBy]) {
                e.createdBy = {
                    _id: userMap[e.createdBy].id || userMap[e.createdBy]._id,
                    name: `${userMap[e.createdBy].firstName || ''} ${userMap[e.createdBy].lastName || ''}`.trim(),
                    email: userMap[e.createdBy].email
                };
            }
        });
    }

    // Get single SportsEvent
    getSportsEventById = async (req, res, next) => {
        try {
            const event = await sportsEventService.getSportsEventById(req.params.id);
            if (!event) return res.status(404).json({ success: false, message: "SportsEvent not found" });
            res.status(200).json({ success: true, data: event });
        } catch (err) {
            next(err);
        }
    };

    // Update SportsEvent
    updateSportsEvent = async (req, res, next) => {
        try {
            const event = await sportsEventService.getSportsEventById(req.params.id);
            if (!event) {
                return res.status(404).json({ success: false, message: "SportsEvent not found" });
            }

            // Restriction logic
            if (!req.user.isSuperAdmin) {
                const eCommId = event.communityId || event.community;
                const uCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

                if (eCommId.toString() !== uCommId) {
                    return res.status(403).json({
                        success: false,
                        message: "Not authorized to update SportsEvent outside your community",
                    });
                }
            }

            // Prevent changing community and createdBy in updates
            delete req.body.community;
            delete req.body.createdBy;

            const updated = await sportsEventService.updateSportsEvent(req.params.id, req.body);
            res.status(200).json({ success: true, data: updated });
        } catch (err) {
            next(err);
        }
    };

    // Delete SportsEvent
    deleteSportsEvent = async (req, res, next) => {
        try {
            const event = await sportsEventService.getSportsEventById(req.params.id);
            if (!event) {
                return res.status(404).json({ success: false, message: "SportsEvent not found" });
            }

            // Restriction logic
            if (!req.user.isSuperAdmin) {
                const eCommId = event.communityId || event.community;
                const uCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

                if (eCommId.toString() !== uCommId) {
                    return res.status(403).json({
                        success: false,
                        message: "Not authorized to delete SportsEvent outside your community",
                    });
                }
            }

            // Hard delete
            await sportsEventService.deleteSportsEvent(req.params.id);
            res.status(200).json({ success: true, message: "Deleted" });
        } catch (err) {
            next(err);
        }
    };

    // Get upcoming sports events
    getUpcomingSportsEvents = async (req, res, next) => {
        try {
            const { limit = 5 } = req.query;

            let commId = req.user.community;
            if (req.user.isSuperAdmin && req.query.community) commId = req.query.community;
            if (typeof commId === 'object') commId = commId._id.toString();

            if (!commId) return res.status(200).json({ success: true, data: [] });

            const events = await sportsEventService.getUpcomingSportsEvents(commId);

            // Convert and map attachment
            const plainEvents = events.map(e => {
                const obj = e.toObject ? e.toObject() : e;
                if (obj.url && !obj.attachment) obj.attachment = obj.url;
                return obj;
            });

            await this.populateEvents(plainEvents);

            const limited = plainEvents.slice(0, parseInt(limit));

            res.status(200).json({
                success: true,
                data: limited,
                count: limited.length
            });
        } catch (err) {
            next(err);
        }
    };

    // Get sports events by organizer
    getSportsEventsByOrganizer = async (req, res, next) => {
        try {
            const { organizer } = req.params;
            const { page = 1, limit = 10 } = req.query;

            let commId = req.user.community;
            if (req.user.isSuperAdmin && req.query.community) commId = req.query.community;
            if (!commId && !req.user.isSuperAdmin) return res.status(403).json({ message: "Community required" });
            if (!commId) return res.status(200).json({ success: true, data: [] });

            if (typeof commId === 'object') commId = commId._id.toString();

            const events = await sportsEventService.searchByOrganizer(commId, organizer);
            await this.populateEvents(events);

            // Pagination
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const paginated = events.slice(startIndex, endIndex);

            res.status(200).json({
                success: true,
                data: paginated,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(events.length / limit),
                    totalItems: events.length,
                    itemsPerPage: parseInt(limit)
                }
            });
        } catch (err) {
            next(err);
        }
    };

    // Get sports events statistics
    getSportsEventsStats = async (req, res, next) => {
        try {
            let commId = req.user.community;
            if (req.user.isSuperAdmin && req.query.community) commId = req.query.community;
            if (typeof commId === 'object') commId = commId._id.toString();

            if (!commId) return res.status(200).json({ success: true, data: {} });

            const stats = await sportsEventService.getSportsEventStats(commId);

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (err) {
            next(err);
        }
    };
}

module.exports = new SportsEventController();
