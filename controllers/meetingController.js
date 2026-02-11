const { getMeetingService } = require("../services/meetingService");
const { getCommunityService } = require("../services/communityService");
const { getUserService } = require("../services/userService");

const meetingService = getMeetingService();
const communityService = getCommunityService();
const userService = getUserService();

class MeetingController {

    // Create Meeting
    createMeeting = async (req, res, next) => {
        try {
            let communityId = req.user.community;
            let createdBy = req.user.id;

            if (req.user.isSuperAdmin) {
                // superadmin must explicitly pass community
                if (!req.body.community) {
                    return res.status(400).json({
                        success: false,
                        message: "Community is required when creating Meeting as super admin",
                    });
                }
                communityId = req.body.community;
                createdBy = req.body.createdBy || req.user.id;
            }

            if (typeof communityId === 'object') communityId = communityId._id.toString();

            const meeting = await meetingService.createMeeting(req.body, communityId, createdBy);
            res.status(201).json({ success: true, data: meeting });
        } catch (err) {
            next(err);
        }
    };

    // Get all Meetings (Generic implementation refactored)
    getAllMeetings = async (req, res, next) => {
        try {
            let meetings = [];
            const limit = parseInt(req.query.limit) || 20;

            // Simplified: Community Admin or User
            if (!req.user.community && !req.user.isSuperAdmin) {
                return res.status(403).json({ success: false, message: "Community access required" });
            }

            let commId = req.user.community;
            if (req.user.isSuperAdmin && req.query.community) {
                commId = req.query.community;
            } else if (req.user.isSuperAdmin) {
                // If superadmin but no community, empty list (avoid scan)
                return res.status(200).json({ success: true, count: 0, data: [] });
            }

            if (typeof commId === 'object') commId = commId._id.toString();

            meetings = await meetingService.getMeetingsByCommunity(commId, { limit });

            // Populate
            await this.populateMeetings(meetings);

            res.status(200).json({ success: true, count: meetings.length, data: meetings });
        } catch (err) {
            next(err);
        }
    };

    // Helper to populate
    async populateMeetings(meetings) {
        if (!meetings || meetings.length === 0) return;
        const userIds = meetings.map(m => m.createdBy).filter(id => id);
        // community is usually known from context, but we populate for completeness

        const users = await userService.getManyByIds(userIds);
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

        // Fetch community names if needed? 
        // For now, simpler population
        meetings.forEach(m => {
            if (m.createdBy && userMap[m.createdBy]) {
                m.createdBy = {
                    _id: userMap[m.createdBy].id || userMap[m.createdBy]._id,
                    name: `${userMap[m.createdBy].firstName || ''} ${userMap[m.createdBy].lastName || ''}`.trim(),
                    email: userMap[m.createdBy].email
                };
            }
            // community name populated?
            // m.community = ... (service call if needed)
        });
    }

    // Get single Meeting
    getMeetingById = async (req, res, next) => {
        try {
            const meeting = await meetingService.getMeetingById(req.params.id);
            if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });
            res.status(200).json({ success: true, data: meeting });
        } catch (err) {
            next(err);
        }
    };

    // Update Meeting
    updateMeeting = async (req, res, next) => {
        try {
            const meeting = await meetingService.getMeetingById(req.params.id);
            if (!meeting) {
                return res.status(404).json({ success: false, message: "Meeting not found" });
            }

            // Restriction logic
            if (!req.user.isSuperAdmin) {
                const mCommId = meeting.communityId || meeting.community;
                const uCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

                if (mCommId.toString() !== uCommId) {
                    return res.status(403).json({
                        success: false,
                        message: "Not authorized to update Meeting outside your community",
                    });
                }
            }

            const updated = await meetingService.updateMeeting(req.params.id, req.body);
            res.status(200).json({ success: true, data: updated });
        } catch (err) {
            next(err);
        }
    };

    // Delete Meeting
    deleteMeeting = async (req, res, next) => {
        try {
            const meeting = await meetingService.getMeetingById(req.params.id);
            if (!meeting) {
                return res.status(404).json({ success: false, message: "Meeting not found" });
            }

            // Restriction logic
            if (!req.user.isSuperAdmin) {
                const mCommId = meeting.communityId || meeting.community;
                const uCommId = req.user.community._id ? req.user.community._id.toString() : req.user.community;

                if (mCommId.toString() !== uCommId) {
                    return res.status(403).json({
                        success: false,
                        message: "Not authorized to delete Meeting outside your community",
                    });
                }
            }

            await meetingService.deleteMeeting(req.params.id);
            res.status(200).json({ success: true, message: "Deleted" });
        } catch (err) {
            next(err);
        }
    };

    // Get meetings by organizer
    getMeetingsByOrganizer = async (req, res, next) => {
        try {
            const { organizer } = req.params;
            const { page = 1, limit = 10 } = req.query;

            // Resolve Community
            let commId = req.user.community;
            if (req.user.isSuperAdmin && req.query.community) commId = req.query.community;
            if (!commId && !req.user.isSuperAdmin) return res.status(403).json({ message: "Community required" });
            if (!commId) return res.status(200).json({ success: true, data: [] });

            if (typeof commId === 'object') commId = commId._id.toString();

            const meetings = await meetingService.searchByOrganizer(commId, organizer);

            // Populate
            await this.populateMeetings(meetings);

            // Pagination (Manual slice as we search all)
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const paginated = meetings.slice(startIndex, endIndex);

            res.status(200).json({
                success: true,
                data: paginated,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(meetings.length / limit),
                    totalItems: meetings.length,
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

            let commId = req.user.community;
            if (req.user.isSuperAdmin && req.query.community) commId = req.query.community;
            if (typeof commId === 'object') commId = commId._id.toString();

            if (!commId) return res.status(200).json({ success: true, data: [] });

            const meetings = await meetingService.getUpcomingMeetings(commId);
            // Populate
            await this.populateMeetings(meetings);

            // Limit
            const limited = meetings.slice(0, parseInt(limit));

            res.status(200).json({
                success: true,
                data: limited,
                count: limited.length
            });
        } catch (err) {
            next(err);
        }
    };

    // Get meeting statistics
    getMeetingStats = async (req, res, next) => {
        try {
            let commId = req.user.community;
            if (req.user.isSuperAdmin && req.query.community) commId = req.query.community;
            if (typeof commId === 'object') commId = commId._id.toString();

            if (!commId) return res.status(200).json({ success: true, data: {} });

            const stats = await meetingService.getMeetingStats(commId);

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (err) {
            next(err);
        }
    };
}

module.exports = new MeetingController();