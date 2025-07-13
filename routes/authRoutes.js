const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { auth, authRateLimit, passwordResetLimit } = require('../middleware/auth');
// const upload = require('../middleware/upload');

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid phone number'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

const loginValidation = [
  body('emailOrPhone')
    .notEmpty()
    .withMessage('Email or phone number is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const joinCommunityValidation = [
  body('joinKey')
    .isLength({ min: 8, max: 8 })
    .withMessage('Join key must be 8 characters'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid phone number'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

const communityRequestValidation = [
  body('communityName')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Community name must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('category')
    .isIn(['Educational', 'Professional', 'Social', 'Sports', 'Technology', 'Health', 'Arts', 'Business', 'Other'])
    .withMessage('Please select a valid category'),
  body('contactEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid contact email'),
  body('contactPhone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid contact phone number'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  body('zipCode')
    .trim()
    .notEmpty()
    .withMessage('Zip code is required')
];

const forgotPasswordValidation = [
  body('emailOrPhone')
    .notEmpty()
    .withMessage('Email or phone number is required')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Auth routes

// POST /api/auth/register - Standard user registration (deprecated in favor of join-community)
router.post('/register', authRateLimit, registerValidation, authController.register);

// POST /api/auth/login - User login with email/phone and password
router.post('/login', authRateLimit, loginValidation, authController.login);

// POST /api/auth/logout - User logout
router.post('/logout', auth, authController.logout);

// POST /api/auth/join-community - Join community with unique key and user details
router.post('/join-community', authRateLimit, joinCommunityValidation, authController.joinCommunity);

// POST /api/auth/request-community - Request new community registration
// router.post('/request-community', 
//   authRateLimit,
//   upload.fields([
//     { name: 'documents', maxCount: 5 },
//     { name: 'logo', maxCount: 1 }
//   ]),
//   communityRequestValidation,
//   authController.requestCommunity
// );

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', passwordResetLimit, forgotPasswordValidation, authController.forgotPassword);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', passwordResetLimit, resetPasswordValidation, authController.resetPassword);

// GET /api/auth/verify-email/:token - Verify email address
router.get('/verify-email/:token', authController.verifyEmail);

// POST /api/auth/resend-verification - Resend email verification
router.post('/resend-verification', auth, authController.resendEmailVerification);

// GET /api/auth/me - Get current user profile
router.get('/me', auth, authController.getCurrentUser);

// POST /api/auth/refresh-token - Refresh JWT token
router.post('/refresh-token', authController.refreshToken);

// GET /api/auth/community/:joinKey - Get community info by join key (public)
router.get('/community/:joinKey', authController.getCommunityByJoinKey);

// POST /api/auth/validate-join-key - Validate community join key
router.post('/validate-join-key', 
  body('joinKey').isLength({ min: 8, max: 8 }).withMessage('Join key must be 8 characters'),
  authController.validateJoinKey
);

module.exports = router;