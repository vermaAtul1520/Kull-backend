// tests/unit/repositories/userRepository.test.js
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('../../../db');
jest.mock('../../../models/User');

const db = require('../../../db');
const User = require('../../../models/User');
const { UserRepository } = require('../../../repositories/userRepository');

const mockAdapter = {
    getModel: jest.fn(),
    generateId: jest.fn().mockReturnValue('mock-id'),
    query: jest.fn(),
    getItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
};

describe('UserRepository (MongoDB Mode)', () => {
    let userRepo;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();

        mockQuery = {
            populate: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: jest.fn(),
        };

        // Static methods
        User.find.mockReturnValue(mockQuery);
        User.findOne.mockReturnValue(mockQuery);
        User.findById.mockReturnValue(mockQuery);
        User.findByIdAndUpdate.mockReturnValue(mockQuery);
        User.findByIdAndDelete.mockResolvedValue(true);
        User.countDocuments.mockResolvedValue(0);

        // Constructor mock
        User.mockImplementation(function (data) {
            this.save = jest.fn().mockResolvedValue({
                toObject: () => this
            });
            this.toObject = () => this;
            Object.assign(this, data);
            return this;
        });

        // Export mockQuery for easy access
        User._query = mockQuery;

        db.getAdapter.mockReturnValue(mockAdapter);
        db.getDatabaseType.mockReturnValue('mongodb');
        mockAdapter.getModel.mockReturnValue(User);

        userRepo = new UserRepository();
    });

    describe('findById', () => {
        it('should find a user by ID', async () => {
            const mockUser = { _id: 'user123', firstName: 'John' };
            User._query.lean.mockResolvedValue(mockUser);

            const result = await userRepo.findById('user123');

            expect(db.getAdapter).toHaveBeenCalled();
            expect(mockAdapter.getModel).toHaveBeenCalledWith('User');
            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(result).toEqual({ ...mockUser, id: 'user123' });
        });
    });

    describe('findByEmail', () => {
        it('should find a user by email', async () => {
            const mockUser = { _id: 'user123', email: 'john@example.com' };
            User._query.lean.mockResolvedValue(mockUser);

            const result = await userRepo.findByEmail('john@example.com');

            expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
            expect(result).toEqual({ ...mockUser, id: 'user123' });
        });
    });

    describe('create', () => {
        it('should create a new user', async () => {
            const userData = { firstName: 'John', email: 'john@example.com' };

            const result = await userRepo.create(userData);

            expect(User).toHaveBeenCalled();
            expect(result).toMatchObject({ firstName: 'John', email: 'john@example.com' });
        });
    });

    describe('updateById', () => {
        it('should update a user by ID', async () => {
            const updates = { firstName: 'Jane' };
            const mockUser = { _id: 'user123', firstName: 'Jane' };
            User._query.lean.mockResolvedValue(mockUser);

            const result = await userRepo.updateById('user123', updates);

            expect(User.findByIdAndUpdate).toHaveBeenCalled();
            expect(result).toEqual({ ...mockUser, id: 'user123' });
        });
    });
});
