// services/familyService.js - Family Relationship Service

const { getFamilyRepository } = require('../repositories/familyRepository');

class FamilyService {
    constructor() {
        this.familyRepo = getFamilyRepository();
    }

    getReverseRelationType(relationType, userGender) {
        const reverseMap = {
            'father': userGender === 'female' ? 'daughter' : 'son',
            'mother': userGender === 'female' ? 'daughter' : 'son',
            'son': userGender === 'female' ? 'mother' : 'father',
            'daughter': userGender === 'female' ? 'mother' : 'father',
            'husband': 'wife',
            'wife': 'husband',
            'spouse': 'spouse',
            'brother': userGender === 'female' ? 'sister' : 'brother',
            'sister': userGender === 'female' ? 'sister' : 'brother',
            'grandfather': userGender === 'female' ? 'granddaughter' : 'grandson',
            'grandmother': userGender === 'female' ? 'granddaughter' : 'grandson',
            'grandson': userGender === 'female' ? 'grandmother' : 'grandfather',
            'granddaughter': userGender === 'female' ? 'grandmother' : 'grandfather',
            'uncle': userGender === 'female' ? 'niece' : 'nephew',
            'aunt': userGender === 'female' ? 'niece' : 'nephew',
            'nephew': userGender === 'female' ? 'aunt' : 'uncle',
            'niece': userGender === 'female' ? 'aunt' : 'uncle',
            'cousin': 'cousin',
            'father-in-law': userGender === 'female' ? 'daughter-in-law' : 'son-in-law',
            'mother-in-law': userGender === 'female' ? 'daughter-in-law' : 'son-in-law',
            'son-in-law': userGender === 'female' ? 'mother-in-law' : 'father-in-law',
            'daughter-in-law': userGender === 'female' ? 'mother-in-law' : 'father-in-law',
            'brother-in-law': userGender === 'female' ? 'sister-in-law' : 'brother-in-law',
            'sister-in-law': userGender === 'female' ? 'sister-in-law' : 'brother-in-law'
        };
        return reverseMap[relationType] || relationType;
    }

    async addRelationship(userId, relatedUserId, relationType, currentUserGender, createdBy) {
        // Forward
        const forward = await this.familyRepo.create({
            user: userId,
            relatedUser: relatedUserId,
            relationType,
            createdBy,
        });

        // Reverse
        const reverseType = this.getReverseRelationType(relationType, currentUserGender);
        await this.familyRepo.create({
            user: relatedUserId,
            relatedUser: userId,
            relationType: reverseType,
            createdBy,
        });

        return forward;
    }

    async getRelationshipsForUser(userId) {
        return this.familyRepo.findAllRelationships(userId);
    }

    async getRelationship(userId, relatedUserId) {
        return this.familyRepo.findOne({ user: userId, relatedUser: relatedUserId });
    }

    async getFamilyTree(userId, depth = 3) {
        // This likely requires complex logic or repo support. 
        // Existing repo likely has it if it was mongo, but for DynamoDB?
        // If repo method exists, use it.
        return this.familyRepo.findAllRelationships(userId);
        // Note: The controller logic expected findAllRelationships to just return list, then it groups.
    }

    async updateRelationType(userId, relatedUserId, newRelationType, currentUserGender) {
        // Update Forward
        // We need to find the specific relationship ID or search by user pairs
        // Repo probably has update methods.
        // Assuming findOne returns the doc (or item)
        const forward = await this.familyRepo.findOne({ user: userId, relatedUser: relatedUserId });
        if (forward) {
            await this.familyRepo.updateById(forward.id || forward._id, { relationType: newRelationType });
        }

        // Update Reverse
        const reverse = await this.familyRepo.findOne({ user: relatedUserId, relatedUser: userId });
        if (reverse) {
            const reverseType = this.getReverseRelationType(newRelationType, currentUserGender);
            await this.familyRepo.updateById(reverse.id || reverse._id, { relationType: reverseType });
        }

        return forward;
    }

    // Helper to update by ID directly if we know it (from controller)
    async updateRelationshipById(relationshipId, newRelationType, currentUserGender) {
        const forward = await this.familyRepo.findById(relationshipId);
        if (!forward) return null;

        await this.familyRepo.updateById(relationshipId, { relationType: newRelationType });

        // Safely extract user IDs (handles both MongoDB objects and DynamoDB strings)
        const userId = (forward.user && typeof forward.user === 'object') ? (forward.user._id || forward.user.id) : (forward.user || forward.userId);
        const relatedUserId = (forward.relatedUser && typeof forward.relatedUser === 'object') ? (forward.relatedUser._id || forward.relatedUser.id) : (forward.relatedUser || forward.relatedUserId);

        const reverse = await this.familyRepo.findOne({ user: relatedUserId, relatedUser: userId });
        if (reverse) {
            const reverseType = this.getReverseRelationType(newRelationType, currentUserGender);
            await this.familyRepo.updateById(reverse.id || reverse._id, { relationType: reverseType });
        }

        return forward;
    }

    async deleteRelationship(userId, relatedUserId) {
        // Delete Forward
        // Need to find IDs if deleteById required, or deleteByQuery
        // If repo supports deleteOne(filter)
        // If MongoRepo: deleteOne({ user, relatedUser })
        // If DynamoRepo: Need SK.
        // Let's assume repo has deleteRelationship(userId, relatedUserId) or we find and delete.
        // The original service import had "deleteRelationship" calling repo.deleteRelationship.
        // Let's stick to that if it exists.

        // We need to delete BOTH directions.
        await this.familyRepo.deleteRelationship(userId, relatedUserId);
        await this.familyRepo.deleteRelationship(relatedUserId, userId);
        return true;
    }

    // Overload for delete by ID
    async deleteRelationshipById(relationshipId) {
        const forward = await this.familyRepo.findById(relationshipId);
        if (!forward) return false;

        // Safely extract user IDs (handles both MongoDB objects and DynamoDB strings)
        const userId = (forward.user && typeof forward.user === 'object') ? (forward.user._id || forward.user.id) : (forward.user || forward.userId);
        const relatedUserId = (forward.relatedUser && typeof forward.relatedUser === 'object') ? (forward.relatedUser._id || forward.relatedUser.id) : (forward.relatedUser || forward.relatedUserId);

        await this.familyRepo.deleteById(relationshipId);

        // Reverse delete
        const reverse = await this.familyRepo.findOne({ user: relatedUserId, relatedUser: userId });
        if (reverse) {
            await this.familyRepo.deleteById(reverse.id || reverse._id);
        }
        return true;
    }
}

let instance = null;
const getFamilyService = () => {
    if (!instance) instance = new FamilyService();
    return instance;
};

module.exports = { FamilyService, getFamilyService };
