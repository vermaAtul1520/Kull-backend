const express = require('express');
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const { queryParser } = require("../middleware/queryParser");
const sportsEventController = require('../controllers/sportsEventController');

// Create SportsEvent
router.post("/", isAuthenticated, isSuperOrCommunityAdmin, sportsEventController.createSportsEvent);

// List all sports events with queryParser
router.get(
    "/",
    isAuthenticated,
    queryParser({
        allowFilterFields: [
            "title",
            "organizer",
            "location",
            "category",
            "type",
            "eventType",
            "eventDate",
            "isUpcoming",
            "community",
            "createdBy",
            "createdAt",
        ],
        allowSortFields: ["title", "organizer", "location", "eventDate", "category", "eventType", "createdAt"],
        maxLimit: 50,
    }),
    sportsEventController.getAllSportsEvents
);

// Get upcoming sports events
router.get("/upcoming", isAuthenticated, sportsEventController.getUpcomingSportsEvents);

// Get sports events statistics
router.get("/stats", isAuthenticated, sportsEventController.getSportsEventsStats);

// Get sports events by organizer
router.get("/organizer/:organizer", isAuthenticated, sportsEventController.getSportsEventsByOrganizer);

// Get single sports event
router.get("/:id", isAuthenticated, sportsEventController.getSportsEventById);

// Update sports event
router.put("/:id", isAuthenticated, isSuperOrCommunityAdmin, sportsEventController.updateSportsEvent);

// Delete sports event
router.delete("/:id", isAuthenticated, isSuperOrCommunityAdmin, sportsEventController.deleteSportsEvent);

module.exports = router;