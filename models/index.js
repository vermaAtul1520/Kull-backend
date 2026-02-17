
/**
 * models/index.js
 * Centrally registers and exports all Mongoose models.
 * This ensures that models are registered with Mongoose before they are used
 * by the database abstraction layer.
 */

require('./User');
require('./Community');
require('./Post');
require('./Donation');
require('./News');
require('./Occasion');
require('./Appeal');
require('./Dukaan');
require('./EducationResource');
require('./JobPost');
require('./Kartavya');
require('./Meeting');
require('./SportsEvent');
require('./FamilyRelationship');
require('./Bhajan');
require('./Comment');
require('./Like');

module.exports = {
    // You can also export them if needed elsewhere, but the main goal is registration
    User: require('./User'),
    Community: require('./Community').Community,
    CommunityConfiguration: require('./Community').CommunityConfiguration,
};
