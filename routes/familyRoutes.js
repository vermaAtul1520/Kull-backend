const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const isAuthenticated = require('../middleware/isAuthenticated');

// Search users for adding to family tree
router.get('/search', isAuthenticated, familyController.searchUsers);

// Get family tree
router.get('/tree/:userId?', isAuthenticated, familyController.getFamilyTree);

// Add family relationship
router.post('/add', isAuthenticated, familyController.addFamilyRelationship);

// Update family relationship
router.put('/update/:relationshipId', isAuthenticated, familyController.updateFamilyRelationship);

// Remove family relationship
router.delete('/remove/:relationshipId', isAuthenticated, familyController.removeFamilyRelationship);

module.exports = router;