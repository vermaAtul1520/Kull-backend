// tests/unit/services/authService.test.js
// Unit tests for Authentication Service

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../repositories/userRepository', () => ({
    getUserRepository: jest.fn(),
}));
jest.mock('../../../repositories/communityRepository', () => ({
    getCommunityRepository: jest.fn(),
}));
jest.mock('../../../services/emailService', () => ({
    sendWelcomeEmail: jest.fn().mockImplementation(() => Promise.resolve(true)),
    sendEmail: jest.fn().mockImplementation(() => Promise.resolve(true)),
}));

const { AuthService } = require('../../../services/authService');
const { getUserRepository } = require('../../../repositories/userRepository');
const { getCommunityRepository } = require('../../../repositories/communityRepository');
const emailService = require('../../../services/emailService');

describe('AuthService', () => {
    let authService;
    let mockUserRepo;
    let mockCommunityRepo;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUserRepo = {
            findByEmail: jest.fn(),
            findAllByEmail: jest.fn(),
            findByPhone: jest.fn(),
            findAllByPhone: jest.fn(),
            findByIdWithPassword: jest.fn(),
            create: jest.fn(),
            updateById: jest.fn(),
        };
        getUserRepository.mockReturnValue(mockUserRepo);

        mockCommunityRepo = {
            findByCode: jest.fn(),
        };
        getCommunityRepository.mockReturnValue(mockCommunityRepo);

        // Ensure emailService mocks return promises with .catch method
        emailService.sendWelcomeEmail.mockImplementation(() => Promise.resolve(true));
        emailService.sendEmail.mockImplementation(() => Promise.resolve(true));

        authService = new AuthService();
    });

    describe('signup', () => {
        const validUserData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
        };

        it('should create a new user successfully', async () => {
            const createdUser = {
                _id: 'user123',
                ...validUserData,
                code: 'USR-001',
                communityStatus: 'pending'
            };

            bcrypt.hash.mockResolvedValue('hashedPassword');
            mockUserRepo.create.mockResolvedValue(createdUser);

            const result = await authService.signup(validUserData);

            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(mockUserRepo.create).toHaveBeenCalled();
            expect(result.user.code).toBe('USR-001');
            expect(result.message).toContain('Signup successful');
        });

        it('should auto-approve user with valid referral code', async () => {
            const createdUser = {
                _id: 'user123',
                ...validUserData,
                code: 'USR-001',
                communityStatus: 'approved'
            };
            const community = { _id: 'community123', name: 'Test Community' };

            bcrypt.hash.mockResolvedValue('hashedPassword');
            mockUserRepo.create.mockResolvedValue(createdUser);
            mockCommunityRepo.findByCode.mockResolvedValue(community);
            mockUserRepo.updateById.mockResolvedValue(createdUser);

            const result = await authService.signup(validUserData, 'VALID-REF');

            expect(mockCommunityRepo.findByCode).toHaveBeenCalledWith('VALID-REF');
            expect(result.message).toContain('automatically approved');
        });

        it('should throw error if email and phone are missing', async () => {
            const invalidData = { firstName: 'John', password: '123456' };

            await expect(authService.signup(invalidData))
                .rejects.toEqual({ status: 400, message: 'Either email or phone is required' });
        });

        it('should throw error if password is too short', async () => {
            const invalidData = { ...validUserData, password: 'ab' };

            await expect(authService.signup(invalidData))
                .rejects.toEqual({
                    status: 400,
                    message: 'Password is required and should be at least 3 characters long'
                });
        });
    });

    describe('login', () => {
        it('should login user with valid credentials', async () => {
            const mockUser = {
                _id: 'user123',
                email: 'john@example.com',
                role: 'user',
                community: 'community123',
                communityStatus: 'approved',
            };
            const mockUserWithPassword = { ...mockUser, password: 'hashedPassword' };

            mockUserRepo.findAllByEmail.mockResolvedValue([mockUser]);
            mockUserRepo.findByIdWithPassword.mockResolvedValue(mockUserWithPassword);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('jwt-token-123');

            const result = await authService.login('john@example.com', 'password123');

            expect(result.token).toBe('jwt-token-123');
            expect(result.user.email).toBe('john@example.com');
        });

        it('should throw error for invalid credentials', async () => {
            mockUserRepo.findAllByEmail.mockResolvedValue([]);
            mockUserRepo.findAllByPhone.mockResolvedValue([]);

            await expect(authService.login('invalid@example.com', 'password'))
                .rejects.toEqual({ status: 401, message: 'Invalid user.' });
        });

        it('should throw error for wrong password', async () => {
            const mockUser = { _id: 'user123', email: 'john@example.com' };
            const mockUserWithPassword = { ...mockUser, password: 'hashedPassword' };

            mockUserRepo.findAllByEmail.mockResolvedValue([mockUser]);
            mockUserRepo.findByIdWithPassword.mockResolvedValue(mockUserWithPassword);
            bcrypt.compare.mockResolvedValue(false);

            await expect(authService.login('john@example.com', 'wrongpassword'))
                .rejects.toEqual({ status: 401, message: 'Invalid credentials.' });
        });

        it('should throw error for unapproved user', async () => {
            const mockUser = {
                _id: 'user123',
                email: 'john@example.com',
                role: 'user',
                community: 'community123',
                communityStatus: 'pending',
            };
            const mockUserWithPassword = { ...mockUser, password: 'hashedPassword' };

            mockUserRepo.findAllByEmail.mockResolvedValue([mockUser]);
            mockUserRepo.findByIdWithPassword.mockResolvedValue(mockUserWithPassword);
            bcrypt.compare.mockResolvedValue(true);

            await expect(authService.login('john@example.com', 'password123'))
                .rejects.toEqual({
                    status: 403,
                    message: 'You must belong to an approved community to login.'
                });
        });
    });
});
