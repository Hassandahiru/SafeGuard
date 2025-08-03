import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate, authRateLimit } from '../middleware/auth.js';
import { userValidations, sanitizeInputs } from '../middleware/validation.js';

const router = express.Router();

// Apply input sanitization to all routes
router.use(sanitizeInputs);

// Apply rate limiting to auth routes
router.use(authRateLimit);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', userValidations.register, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', userValidations.login, authController.login);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, userValidations.updateProfile, authController.updateProfile);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, userValidations.changePassword, authController.changePassword);

/**
 * @route   POST /api/auth/request-password-reset
 * @desc    Request password reset
 * @access  Public
 */
router.post('/request-password-reset', userValidations.resetPassword, authController.requestPasswordReset);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', userValidations.confirmResetPassword, authController.resetPassword);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification
 * @access  Private
 */
router.post('/resend-verification', authenticate, authController.resendEmailVerification);

/**
 * @route   GET /api/auth/check
 * @desc    Check authentication status
 * @access  Private
 */
router.get('/check', authenticate, authController.checkAuth);

/**
 * @route   GET /api/auth/permissions
 * @desc    Get user permissions
 * @access  Private
 */
router.get('/permissions', authenticate, authController.getPermissions);

export default router;