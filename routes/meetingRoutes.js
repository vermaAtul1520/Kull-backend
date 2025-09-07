const express = require('express');
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const { queryParser } = require("../middleware/queryParser");
const meetingController = require('../controllers/meetingController');

// Create Meeting
router.post("/", isAuthenticated, isSuperOrCommunityAdmin, meetingController.createMeeting);

// List all meetings with queryParser
router.get(
  "/",
  isAuthenticated,
  queryParser({
    allowFilterFields: [
      "title",
      "organizer",
      "type",
      "documentType",
      "meetingDate",
      "community",
      "createdBy",
      "createdAt",
    ],
    allowSortFields: ["title", "organizer", "meetingDate", "documentType", "createdAt"],
    maxLimit: 50,
  }),
  meetingController.getAllMeetings
);

// Get upcoming meetings
router.get("/upcoming", isAuthenticated, meetingController.getUpcomingMeetings);

// Get meeting statistics
router.get("/stats", isAuthenticated, meetingController.getMeetingStats);

// Get meetings by organizer
router.get("/organizer/:organizer", isAuthenticated, meetingController.getMeetingsByOrganizer);

// Get single meeting
router.get("/:id", isAuthenticated, meetingController.getMeetingById);

// Update meeting
router.put("/:id", isAuthenticated, isSuperOrCommunityAdmin, meetingController.updateMeeting);

// Delete meeting
router.delete("/:id", isAuthenticated, isSuperOrCommunityAdmin, meetingController.deleteMeeting);

module.exports = router;