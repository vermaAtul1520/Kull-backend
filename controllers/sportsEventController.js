const SportsEvent = require('../models/SportsEvent');
const BaseController = require("../utils/baseController");

class SportsEventController extends BaseController {
    constructor() {
        super(SportsEvent);
    }

    // Create SportsEvent
    createSportsEvent = async (req, res, next) => {
        try {
            if (req.user.isSuperAdmin) {
                // superadmin must explicitly pass community
                if (!req.body.community) {
                    return res.status(400).json({
                        success: false,
                        message: "Community is required when creating SportsEvent as super admin",
                    });
                }
                req.body.createdBy = req.body.createdBy || req.user.id;
            } else {
                // community admin or normal user
                if (!req.user.community) {
                    return res.status(400).json({
                        success: false,
                        message: "User must be assigned to a community to create sports events",
                    });
                }
                req.body.community = req.user.community;
                req.body.createdBy = req.user.id;
            }

            const sportsEvent = await this.model.create(req.body);

            // Populate the created sports event
            await sportsEvent.populate([
                { path: 'createdBy', select: 'name email' },
                { path: 'community', select: 'name' }
            ]);

            res.status(201).json({ success: true, data: sportsEvent });
        } catch (err) {
            next(err);
        }
    };

    // Get all SportsEvents
    getAllSportsEvents = async (req, res, next) => {
        try {
            if (req.user.isCommunityAdmin) {
                req.parsedQuery.filter = {
                    ...req.parsedQuery.filter,
                    community: req.user.community,
                };
            } else if (!req.user.isSuperAdmin) {
                // Regular users see all sports events in their community
                req.parsedQuery.filter = {
                    ...req.parsedQuery.filter,
                    community: req.user.community,
                };
            }
            return this.getAll(req, res, next);
        } catch (err) {
            next(err);
        }
    };

    // Get single SportsEvent
    getSportsEventById = (req, res, next) => {
        try {
            return this.getOne(req, res, next);
        } catch (err) {
            next(err);
        }
    };

    // Update SportsEvent
    updateSportsEvent = async (req, res, next) => {
        try {
            const sportsEvent = await this.model.findById(req.params.id);
            if (!sportsEvent) {
                return res.status(404).json({ success: false, message: "SportsEvent not found" });
            }

            // Restriction logic
            if (!req.user.isSuperAdmin) {
                if (sportsEvent.community.toString() !== req.user.community.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: "Not authorized to update SportsEvent outside your community",
                    });
                }
            }

            // Prevent changing community and createdBy in updates
            delete req.body.community;
            delete req.body.createdBy;

            return this.updateOne(req, res, next);
        } catch (err) {
            next(err);
        }
    };

    // Delete SportsEvent
    deleteSportsEvent = async (req, res, next) => {
        try {
            const sportsEvent = await this.model.findById(req.params.id);
            if (!sportsEvent) {
                return res.status(404).json({ success: false, message: "SportsEvent not found" });
            }

            // Restriction logic
            if (!req.user.isSuperAdmin) {
                if (sportsEvent.community.toString() !== req.user.community.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: "Not authorized to delete SportsEvent outside your community",
                    });
                }
            }

            // Soft delete by setting isActive to false
            // req.body = { isActive: false };
            return this.deleteOne(req, res, next);
        } catch (err) {
            next(err);
        }
    };

    // Get upcoming sports events
    getUpcomingSportsEvents = async (req, res, next) => {
        try {
            const { limit = 5 } = req.query;

            let filter = { isActive: true, isUpcoming: true };

            // Apply community restrictions
            if (req.user.isCommunityAdmin) {
                filter.community = req.user.community;
            } else if (!req.user.isSuperAdmin) {
                filter.createdBy = req.user.id;
            }

            const sportsEvents = await this.model.find(filter)
                .populate([
                    { path: 'createdBy', select: 'name email' },
                    { path: 'community', select: 'name' }
                ])
                .sort({ eventDate: 1 })
                .limit(parseInt(limit));

            res.status(200).json({
                success: true,
                data: sportsEvents,
                count: sportsEvents.length
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

            let filter = {
                organizer: new RegExp(organizer, 'i'),
                isActive: true
            };

            // Apply community restrictions
            if (req.user.isCommunityAdmin) {
                filter.community = req.user.community;
            } else if (!req.user.isSuperAdmin) {
                filter.createdBy = req.user.id;
            }

            const sportsEvents = await this.model.find(filter)
                .populate([
                    { path: 'createdBy', select: 'name email' },
                    { path: 'community', select: 'name' }
                ])
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            const total = await this.model.countDocuments(filter);

            res.status(200).json({
                success: true,
                data: sportsEvents,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
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
            let matchFilter = { isActive: true };

            // Apply community restrictions
            if (req.user.isCommunityAdmin) {
                matchFilter.community = req.user.community;
            } else if (!req.user.isSuperAdmin) {
                matchFilter.createdBy = req.user.id;
            }

            const totalEvents = await this.model.countDocuments(matchFilter);

            const upcomingEvents = await this.model.countDocuments({
                ...matchFilter,
                isUpcoming: true
            });

            const eventTypeStats = await this.model.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$eventType', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            const categoryStats = await this.model.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            let communityStats = [];
            if (req.user.isSuperAdmin) {
                communityStats = await this.model.aggregate([
                    { $match: { ...matchFilter, community: { $exists: true } } },
                    { $group: { _id: '$community', count: { $sum: 1 } } },
                    { $lookup: { from: 'communities', localField: '_id', foreignField: '_id', as: 'communityInfo' } },
                    { $unwind: '$communityInfo' },
                    { $project: { _id: 1, count: 1, name: '$communityInfo.name' } },
                    { $sort: { count: -1 } }
                ]);
            }

            res.status(200).json({
                success: true,
                data: {
                    totalEvents,
                    upcomingEventsCount: upcomingEvents,
                    eventTypeBreakdown: eventTypeStats,
                    categoryBreakdown: categoryStats,
                    ...(req.user.isSuperAdmin && { communityBreakdown: communityStats })
                }
            });
        } catch (err) {
            next(err);
        }
    };
}

module.exports = new SportsEventController();
