// services/authService.js - Authentication Service
// Handles user authentication business logic

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserRepository } = require('../repositories/userRepository');
const { getCommunityRepository } = require('../repositories/communityRepository');
const emailService = require('./emailService');

class AuthService {
    constructor() {
        this.userRepo = getUserRepository();
        this.communityRepo = getCommunityRepository();
    }

    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @param {string} referral - Optional referral/community code
     * @returns {Promise<{user: Object, message: string}>}
     */
    async signup(userData, referral = null) {
        const { email, phone, password, ...otherData } = userData;

        // Validate email/phone
        if (!email && !phone) {
            throw { status: 400, message: 'Either email or phone is required' };
        }

        // Validate password
        if (!password || password.length < 3) {
            throw { status: 400, message: 'Password is required and should be at least 3 characters long' };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user (auto-approve if referral code is provided)
        const newUser = await this.userRepo.create({
            ...otherData,
            email,
            phone,
            password: hashedPassword,
            communityStatus: referral ? 'approved' : 'pending',
        });

        // If referral code provided, join community
        if (referral) {
            const community = await this.communityRepo.findByCode(referral);
            if (!community) {
                throw { status: 400, message: 'Invalid referral code' };
            }

            // Update user with community
            await this.userRepo.updateById(newUser.id || newUser._id, {
                community: community._id || community.id,
                roleInCommunity: 'member',
            });

            // Send welcome email (non-blocking)
            if (newUser.email) {
                emailService.sendWelcomeEmail(newUser.email, newUser.firstName).catch(err => {
                    console.error('Failed to send welcome email:', err);
                });
            }
        } else if (process.env.SUPER_ADMIN_EMAIL) {
            // Notify super admin (non-blocking)
            emailService.sendEmail(
                process.env.SUPER_ADMIN_EMAIL,
                'New User Signup Pending Approval',
                this._buildSignupNotificationHtml(newUser)
            ).catch(err => {
                console.error('Failed to send super admin notification:', err);
            });
        }

        return {
            user: {
                id: newUser._id || newUser.id,
                code: newUser.code,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                phone: newUser.phone,
                communityStatus: newUser.communityStatus,
            },
            message: referral
                ? 'Signup successful. You have been automatically approved and added to the community.'
                : 'Signup successful. Super admin has been notified.',
        };
    }

    /**
     * Authenticate user
     * @param {string} emailOrPhone 
     * @param {string} password 
     * @returns {Promise<{token: string, user: Object}>}
     */
    async login(emailOrPhone, password) {
        if (!emailOrPhone || !password) {
            throw { status: 400, message: 'Email or phone and password are required.' };
        }

        // Find user by email or phone
        let user = await this.userRepo.findByEmail(emailOrPhone);
        if (!user) {
            user = await this.userRepo.findByPhone(emailOrPhone);
        }

        if (!user) {
            throw { status: 401, message: 'Invalid user.' };
        }

        // Get password (may need separate query for password)
        const userWithPassword = await this.userRepo.findByIdWithPassword(user._id || user.id);
        if (!userWithPassword || !userWithPassword.password) {
            throw { status: 401, message: 'Invalid credentials.' };
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, userWithPassword.password);
        if (!isMatch) {
            throw { status: 401, message: 'Invalid credentials.' };
        }

        // Check community membership (unless superadmin)
        const communityId = user.community || user.communityId;
        if (user.role !== 'superadmin' && (!communityId || user.communityStatus !== 'approved')) {
            throw { status: 403, message: 'You must belong to an approved community to login.' };
        }

        // Generate token
        const payload = {
            id: user._id || user.id,
            role: user.role,
            email: user.email,
            phone: user.phone,
            community: communityId,
            roleInCommunity: user.roleInCommunity,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'default-secret', {
            expiresIn: '7d',
        });

        // Remove password from response
        const userResponse = { ...user };
        delete userResponse.password;

        return { token, user: userResponse };
    }

    /**
     * Build HTML for signup notification email
     * @private
     */
    _buildSignupNotificationHtml(user) {
        return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #333;">New User Registration - Pending Approval</h2>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
          <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
          <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
          <p><strong>User Code:</strong> ${user.code}</p>
          <p style="color: #ff9800;"><strong>Status:</strong> Pending - No Referral Provided</p>
        </div>
        <p>Please review and approve this user from the admin panel.</p>
      </div>
    `;
    }
}

// Singleton instance
let authServiceInstance = null;

const getAuthService = () => {
    if (!authServiceInstance) {
        authServiceInstance = new AuthService();
    }
    return authServiceInstance;
};

module.exports = { AuthService, getAuthService };
