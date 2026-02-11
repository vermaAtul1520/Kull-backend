// services/userService.js - User Service
// Handles user-related business logic

const bcrypt = require('bcryptjs');
const { getUserRepository } = require('../repositories/userRepository');
const { getCommunityRepository } = require('../repositories/communityRepository');

class UserService {
    constructor() {
        this.userRepo = getUserRepository();
        this.communityRepo = getCommunityRepository();
    }

    /**
     * Get user by ID
     */
    async getUserById(userId) {
        return this.userRepo.findByIdWithPassword(userId);
    }

    async getManyByIds(userIds) {
        // filter out nulls/duplicates
        const ids = [...new Set(userIds.filter(Boolean))];
        if (ids.length === 0) return [];

        // Concurrent fetch
        const users = await Promise.all(ids.map(id => this.userRepo.findById(id)));
        return users.filter(Boolean);
    }

    /**
     * Get user profile with community info
     */
    async getUserProfile(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) return null;

        if (user.community) {
            const community = await this.communityRepo.findById(user.community);
            return { ...user, communityDetails: community };
        }
        return user;
    }

    /**
     * Update user profile
     */
    async updateProfile(userId, updates) {
        // Remove sensitive fields
        delete updates.password;
        delete updates.role;
        delete updates.communityStatus;

        return this.userRepo.updateById(userId, updates);
    }

    /**
     * Change user password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.userRepo.findByIdWithPassword(userId);
        if (!user) {
            throw { status: 404, message: 'User not found' };
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            throw { status: 401, message: 'Current password is incorrect' };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return this.userRepo.updateById(userId, { password: hashedPassword });
    }

    /**
     * Get users by community
     */
    async getUsersByCommunity(communityId, options = {}) {
        return this.userRepo.findByCommunity(communityId, options);
    }

    /**
     * Approve user for community
     */
    async approveUser(userId) {
        return this.userRepo.updateById(userId, { communityStatus: 'approved' });
    }

    /**
     * Reject user from community
     */
    async rejectUser(userId) {
        return this.userRepo.updateById(userId, { communityStatus: 'rejected' });
    }

    /**
     * Get all users (admin)
     */
    async getAllUsers(options = {}) {
        return this.userRepo.find({}, options);
    }

    /**
     * Delete user
     */
    async deleteUser(userId) {
        return this.userRepo.deleteById(userId);
    }

    /**
     * Search users
     */
    async searchUsers(query, communityId = null) {
        const criteria = {};

        if (communityId) {
            criteria.community = communityId;
        }

        // For MongoDB, use regex
        if (query) {
            criteria.$or = [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
            ];
        }

        return this.userRepo.find(criteria, { limit: 50 });
    }

    /**
     * Create user by admin
     */
    async createUserByAdmin(userData, adminUser) {
        // Validate basic fields
        if (!userData.firstName || !userData.lastName) {
            throw { status: 400, message: "First name and last name are required" };
        }
        if (!userData.email && !userData.phone) {
            throw { status: 400, message: "Either email or phone is required" };
        }
        if (!userData.password) {
            throw { status: 400, message: "Password is required" };
        }

        // Check duplicates
        const existing = await this.userRepo.find({
            $or: [
                { email: userData.email },
                { phone: userData.phone }
            ]
        });

        // existing is array in find
        if (existing && existing.length > 0) {
            throw { status: 400, message: "User with this email or phone already exists" };
        }

        const plainPassword = userData.password;
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Determine community
        let communityId = null;
        if (adminUser.role === 'superadmin') {
            communityId = userData.community; // Passed in body or params
        } else if (adminUser.roleInCommunity === 'admin') {
            communityId = adminUser.community;
        }

        if (!communityId) {
            throw { status: 400, message: "Community assignment is required" };
        }

        // Check community exists if superadmin
        if (adminUser.role === 'superadmin') {
            const comm = await this.communityRepo.findById(communityId);
            if (!comm) throw { status: 404, message: "Community not found" };
        }

        const newUser = await this.userRepo.create({
            ...userData,
            password: hashedPassword,
            plainTextPassword: plainPassword,
            community: communityId,
            status: true,
            role: 'user',
            // Default fields if undefined
            roleInCommunity: userData.roleInCommunity || "member",
            communityStatus: userData.communityStatus || "approved",
            interests: userData.interests || [],
        });

        return { user: newUser, plainPassword };
    }

    /**
     * Get officers for community
     */
    async getOfficers(communityId) {
        return this.userRepo.find({
            community: communityId,
            positionInCommunity: 'officer' // Exact match
        });
    }

    /**
     * Advanced search for community users (filters)
     */
    async searchCommunityUsers(communityId, filter = {}, options = {}) {
        // Merge filter with community
        const finalFilter = { ...filter, community: communityId };

        if (filter.search) {
            const searchTerm = filter.search;
            delete finalFilter.search;
            finalFilter.$or = [
                { firstName: { $regex: searchTerm, $options: "i" } },
                { lastName: { $regex: searchTerm, $options: "i" } },
                { email: { $regex: searchTerm, $options: "i" } },
                { phone: { $regex: searchTerm, $options: "i" } },
                { gotra: { $regex: searchTerm, $options: "i" } },
                // Add other fields as needed
            ];
        }

        return this.userRepo.find(finalFilter, options);
    }

    async countCommunityUsers(communityId, filter = {}) {
        const finalFilter = { ...filter, community: communityId };
        if (filter.search) {
            const searchTerm = filter.search;
            delete finalFilter.search;
            finalFilter.$or = [
                { firstName: { $regex: searchTerm, $options: "i" } },
                // ... same regex payload
            ];
        }
        return this.userRepo.count(finalFilter);
    }
}

let userServiceInstance = null;

const getUserService = () => {
    if (!userServiceInstance) {
        userServiceInstance = new UserService();
    }
    return userServiceInstance;
};

module.exports = { UserService, getUserService };
