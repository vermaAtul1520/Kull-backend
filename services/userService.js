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
        delete updates.id;
        delete updates._id;
        delete updates.pk;
        delete updates.sk;

        return this.userRepo.updateById(userId, updates);
    }

    /**
     * Update user by admin (allows communityStatus etc)
     */
    async updateUser(userId, updates) {
        delete updates.id;
        delete updates._id;
        delete updates.pk;
        delete updates.sk;

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

        if (query) {
            criteria.$or = [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
                { gotra: { $regex: query, $options: 'i' } },
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
        const checkPromises = [];
        if (userData.email) checkPromises.push(this.userRepo.findByEmail(userData.email));
        if (userData.phone) checkPromises.push(this.userRepo.findByPhone(userData.phone));

        const existingUsers = await Promise.all(checkPromises);
        if (existingUsers.some(u => u)) {
            throw { status: 400, message: 'User with this email or phone already exists' };
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
        if (this.userRepo.isDynamoDB()) {
            const allUsers = await this.userRepo.findByCommunity(communityId, { limit: undefined });
            return allUsers.filter(u =>
                u.positionInCommunity &&
                u.positionInCommunity.trim() !== '' &&
                u.positionInCommunity.toLowerCase() !== 'member'
            );
        }

        return this.userRepo.find({
            community: communityId,
            positionInCommunity: { $ne: null, $exists: true, $regex: /^(?!member$)/i }
        });
    }

    /**
     * Advanced search for community users (filters)
     */
    async searchCommunityUsers(communityId, filter = {}, options = {}) {
        // DynamoDB: In-memory filtering/sorting/pagination
        if (this.userRepo.isDynamoDB()) {
            // 1. Fetch all users for the community (no limit)
            const allUsers = await this.userRepo.findByCommunity(communityId, { limit: undefined });

            let filtered = allUsers;

            // 2. Apply search
            if (filter.search) {
                const term = filter.search.toLowerCase();
                filtered = filtered.filter(u =>
                    (u.firstName && u.firstName.toLowerCase().includes(term)) ||
                    (u.lastName && u.lastName.toLowerCase().includes(term)) ||
                    (u.email && u.email.toLowerCase().includes(term)) ||
                    (u.phone && u.phone.includes(term)) ||
                    (u.gotra && u.gotra && u.gotra.toLowerCase().includes(term))
                );
            }

            // 3. Apply other filters
            Object.keys(filter).forEach(key => {
                if (key !== 'search' && key !== 'community' && key !== '$or') {
                    // Loose equality for strings/numbers
                    filtered = filtered.filter(u => u[key] == filter[key]);
                }
            });

            // 4. Apply Sort
            if (options.sort) {
                const sortField = Object.keys(options.sort)[0];
                const order = options.sort[sortField] === 1 ? 1 : -1;
                filtered.sort((a, b) => {
                    const valA = (a[sortField] || '').toString().toLowerCase();
                    const valB = (b[sortField] || '').toString().toLowerCase();
                    if (valA < valB) return -1 * order;
                    if (valA > valB) return 1 * order;
                    return 0;
                });
            }

            // 5. Apply Pagination
            const skip = parseInt(options.skip) || 0;
            const limit = parseInt(options.limit) || 20;
            return filtered.slice(skip, skip + limit);
        }

        // MongoDB: Existing logic
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
            ];
        }

        return this.userRepo.find(finalFilter, options);
    }

    async countCommunityUsers(communityId, filter = {}) {
        if (this.userRepo.isDynamoDB()) {
            const allUsers = await this.userRepo.findByCommunity(communityId, { limit: undefined });
            let filtered = allUsers;

            if (filter.search) {
                const term = filter.search.toLowerCase();
                filtered = filtered.filter(u =>
                    (u.firstName && u.firstName.toLowerCase().includes(term)) ||
                    (u.lastName && u.lastName.toLowerCase().includes(term)) ||
                    (u.email && u.email.toLowerCase().includes(term)) ||
                    (u.phone && u.phone.includes(term)) ||
                    (u.gotra && u.gotra && u.gotra.toLowerCase().includes(term))
                );
            }

            Object.keys(filter).forEach(key => {
                if (key !== 'search' && key !== 'community' && key !== '$or') {
                    filtered = filtered.filter(u => u[key] == filter[key]);
                }
            });

            return filtered.length;
        }

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

    /**
     * Sanitize user object (remove sensitive fields)
     * @param {Object} user 
     * @returns {Object}
     */
    sanitizeUser(user) {
        if (!user) return null;
        // Handle mongoose document
        const sanitized = user.toObject ? user.toObject() : { ...user };

        // Remove sensitive fields
        delete sanitized.password;
        delete sanitized.plainTextPassword;
        delete sanitized.sk;
        delete sanitized.pk;

        return sanitized;
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
