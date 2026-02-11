// tests/unit/repositories/userRepository.test.js
// Unit tests for User Repository

const mongoose = require('mongoose');

// Mock the db module before requiring the repository
jest.mock('../../../db', () => ({
    getDatabaseType: jest.fn(() => 'mongodb'),
    getDb: jest.fn(),
}));

// Mock the User model
jest.mock('../../../models/User', () => {
    const mockUser = {
        find: jest.fn().mockReturnThis(),
        findOne: jest.fn().mockReturnThis(),
        findById: jest.fn().mockReturnThis(),
        findByIdAndUpdate: jest.fn().mockReturnThis(),
        findByIdAndDelete: jest.fn().mockReturnThis(),
        create: jest.fn(),
        countDocuments: jest.fn(),
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    };
    return mockUser;
});

const User = require('../../../models/User');
const { getUserRepository } = require('../../../repositories/userRepository');

describe('UserRepository (MongoDB Mode)', () => {
    let userRepo;

    beforeEach(() => {
        jest.clearAllMocks();
        userRepo = getUserRepository();
    });

    describe('findById', () => {
        it('should find a user by ID', async () => {
            const mockUser = { _id: 'user123', firstName: 'John', lastName: 'Doe' };
            User.findById.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(mockUser),
                }),
            });

            const result = await userRepo.findById('user123');

            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(result).toEqual(mockUser);
        });

        it('should return null for non-existent user', async () => {
            User.findById.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(null),
                }),
            });

            const result = await userRepo.findById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('should find a user by email', async () => {
            const mockUser = { _id: 'user123', email: 'john@example.com' };
            User.findOne.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(mockUser),
                }),
            });

            const result = await userRepo.findByEmail('john@example.com');

            expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
            expect(result).toEqual(mockUser);
        });
    });

    describe('findByPhone', () => {
        it('should find a user by phone', async () => {
            const mockUser = { _id: 'user123', phone: '9876543210' };
            User.findOne.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(mockUser),
                }),
            });

            const result = await userRepo.findByPhone('9876543210');

            expect(User.findOne).toHaveBeenCalledWith({ phone: '9876543210' });
            expect(result).toEqual(mockUser);
        });
    });

    describe('create', () => {
        it('should create a new user with auto-generated code', async () => {
            const userData = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
            const createdUser = { _id: 'user123', ...userData, code: 'USR-001' };
            User.create.mockResolvedValue(createdUser);

            const result = await userRepo.create(userData);

            expect(User.create).toHaveBeenCalled();
            expect(result).toEqual(createdUser);
        });
    });

    describe('updateById', () => {
        it('should update a user by ID', async () => {
            const updatedUser = { _id: 'user123', firstName: 'Jane' };
            User.findByIdAndUpdate.mockResolvedValue(updatedUser);

            const result = await userRepo.updateById('user123', { firstName: 'Jane' });

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                'user123',
                { firstName: 'Jane' },
                { new: true, runValidators: true }
            );
            expect(result).toEqual(updatedUser);
        });
    });

    describe('findByCommunity', () => {
        it('should find users by community', async () => {
            const mockUsers = [
                { _id: 'user1', firstName: 'John' },
                { _id: 'user2', firstName: 'Jane' },
            ];
            User.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        sort: jest.fn().mockReturnValue({
                            limit: jest.fn().mockReturnValue({
                                skip: jest.fn().mockResolvedValue(mockUsers),
                            }),
                        }),
                    }),
                }),
            });

            const result = await userRepo.findByCommunity('community123');

            expect(User.find).toHaveBeenCalledWith({ community: 'community123' });
            expect(result).toEqual(mockUsers);
        });
    });

    describe('count', () => {
        it('should count users matching criteria', async () => {
            User.countDocuments.mockResolvedValue(42);

            const result = await userRepo.count({ communityStatus: 'approved' });

            expect(User.countDocuments).toHaveBeenCalledWith({ communityStatus: 'approved' });
            expect(result).toBe(42);
        });
    });
});
