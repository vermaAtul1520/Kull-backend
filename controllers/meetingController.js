const MeetingDocument = require('../models/Meeting');
const BaseController = require("../utils/baseController");

class MeetingController extends BaseController {
    constructor() {
        super(MeetingDocument);
    }

    // Create Meeting
    createMeeting = async (req, res, next) => {
        try {
            if (req.user.isSuperAdmin) {
                // superadmin must explicitly pass community
                if (!req.body.community) {
                    return res.status(400).json({
                        success: false,
                        message: "Community is required when creating Meeting as super admin",
                    });
                }
                req.body.createdBy = req.body.createdBy || req.user.id;
            } else {
                // community admin or normal user
                req.body.community = req.user.community;
                req.body.createdBy = req.user.id;
            }

            const meeting = await this.model.create(req.body);
            res.status(201).json({ success: true, data: meeting });
        } catch (err) {
            next(err);
        }
    };

    // Get all Meetings
    getAllMeetings = async (req, res, next) => {
        try {
            if (req.user.isCommunityAdmin) {
                req.parsedQuery.filter = {
                    ...req.parsedQuery.filter,
                    community: req.user.community,
                };
            } else if (!req.user.isSuperAdmin) {
                // Regular users see all meetings in their community
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

    // Get single Meeting
    getMeetingById = (req, res, next) => {
        try {
            return this.getOne(req, res, next);
        } catch (err) {
            next(err);
        }
    };

    // Update Meeting
    updateMeeting = async (req, res, next) => {
        try {
            const meeting = await this.model.findById(req.params.id);
            if (!meeting) {
                return res.status(404).json({ success: false, message: "Meeting not found" });
            }

            // Restriction logic
            if (!req.user.isSuperAdmin) {
                if (meeting.community.toString() !== req.user.community.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: "Not authorized to update Meeting outside your community",
                    });
                }
            }

            return this.updateOne(req, res, next);
        } catch (err) {
            next(err);
        }
    };

    // Delete Meeting
    deleteMeeting = async (req, res, next) => {
        try {
            const meeting = await this.model.findById(req.params.id);
            if (!meeting) {
                return res.status(404).json({ success: false, message: "Meeting not found" });
            }

            // Restriction logic
            if (!req.user.isSuperAdmin) {
                if (meeting.community.toString() !== req.user.community.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: "Not authorized to delete Meeting outside your community",
                    });
                }
            }

            return this.deleteOne(req, res, next);
        } catch (err) {
            next(err);
        }
    };

    // Get meetings by organizer
    getMeetingsByOrganizer = async (req, res, next) => {
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

            const meetings = await this.model.find(filter)
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
                data: meetings,
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

    // Get upcoming meetings
    getUpcomingMeetings = async (req, res, next) => {
        try {
            const { limit = 5 } = req.query;

            let filter = { isActive: true };

            // Apply community restrictions
            if (req.user.isCommunityAdmin) {
                filter.community = req.user.community;
            } else if (!req.user.isSuperAdmin) {
                filter.createdBy = req.user.id;
            }

            // Find upcoming meetings based on date/time
            const currentDate = new Date().toISOString().split('T')[0];
            const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

            const upcomingFilter = {
                ...filter,
                $or: [
                    { meetingDate: { $gt: currentDate } },
                    {
                        meetingDate: currentDate,
                        meetingTime: { $gte: currentTime }
                    }
                ]
            };

            const meetings = await this.model.find(upcomingFilter)
                .populate([
                    { path: 'createdBy', select: 'name email' },
                    { path: 'community', select: 'name' }
                ])
                .sort({ meetingDate: 1, meetingTime: 1 })
                .limit(parseInt(limit));

            res.status(200).json({
                success: true,
                data: meetings,
                count: meetings.length
            });
        } catch (err) {
            next(err);
        }
    };

    // Get meeting statistics
    getMeetingStats = async (req, res, next) => {
        try {
            let matchFilter = { isActive: true };

            // Apply community restrictions
            if (req.user.isCommunityAdmin) {
                matchFilter.community = req.user.community;
            } else if (!req.user.isSuperAdmin) {
                matchFilter.createdBy = req.user.id;
            }

            const totalMeetings = await this.model.countDocuments(matchFilter);

            // Get upcoming meetings count
            const currentDate = new Date().toISOString().split('T')[0];
            const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

            const upcomingCount = await this.model.countDocuments({
                ...matchFilter,
                $or: [
                    { meetingDate: { $gt: currentDate } },
                    {
                        meetingDate: currentDate,
                        meetingTime: { $gte: currentTime }
                    }
                ]
            });

            const documentTypeStats = await this.model.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$documentType', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            const typeStats = await this.model.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$type', count: { $sum: 1 } } },
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
                    totalMeetings,
                    upcomingMeetingsCount: upcomingCount,
                    documentTypeBreakdown: documentTypeStats,
                    fileTypeBreakdown: typeStats,
                    ...(req.user.isSuperAdmin && { communityBreakdown: communityStats })
                }
            });
        } catch (err) {
            next(err);
        }
    };
}

module.exports = new MeetingController();