import jwt from 'jsonwebtoken';
import { generateJWT, createResponse } from '../utils/helpers.js';
import { auth } from '../utils/logger.js';
import { 
  AuthenticationError, 
  ValidationError, 
  ConflictError, 
  NotFoundError 
} from '../utils/errors/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import User from '../models/User.js';
import Building from '../models/Building.js';
import config from '../config/environment.js';

class AuthController {
  /**
   * Register a new user
   */
  register = asyncHandler(async (req, res) => {
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      building_id, 
      role = 'resident',
      apartment_number 
    } = req.body;

    // Check if building exists and has available licenses
    const building = await Building.findById(building_id);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    // Check license availability for users that consume licenses
    const usesLicense = ['resident', 'building_admin'].includes(role);
    if (usesLicense && !await Building.hasAvailableLicenses(building_id)) {
      throw new ConflictError('Building has reached its license limit');
    }

    // Create user
    const userData = {
      email,
      password,
      first_name,
      last_name,
      phone,
      building_id,
      role,
      apartment_number,
      uses_license: usesLicense,
      is_active: true,
      is_verified: config.NODE_ENV === 'development' // Auto-verify in development
    };

    const user = await User.create(userData);

    // Update building license count if user uses license
    if (usesLicense) {
      await Building.updateLicenseUsage(building_id, 1);
    }

    // Generate JWT token
    const token = generateJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      building_id: user.building_id
    });

    // Generate refresh token
    const refreshToken = generateJWT({
      userId: user.id,
      type: 'refresh'
    }, config.jwt.refreshExpiresIn);

    // Remove password from response
    const { password_hash, ...userResponse } = user;

    auth.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      building_id: user.building_id,
      ip: req.ip
    });

    res.status(201).json(createResponse(
      true,
      {
        user: userResponse,
        token,
        refreshToken,
        expiresIn: config.jwt.expiresIn
      },
      'User registered successfully'
    ));
  });

  /**
   * Login user
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // Log failed login attempt
      auth.warn('Login attempt with invalid email', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      throw AuthenticationError.invalidCredentials();
    }

    // Check if account is locked
    const isLocked = await User.isAccountLocked(user.id);
    if (isLocked) {
      auth.warn('Login attempt on locked account', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });
      throw AuthenticationError.accountLocked();
    }

    // Authenticate user
    try {
      const authenticatedUser = await User.authenticate(email, password);
      
      // Reset failed login attempts on successful login
      await User.resetLoginAttempts(user.id);

      // Generate JWT token
      const token = generateJWT({
        userId: authenticatedUser.id,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        building_id: authenticatedUser.building_id
      });

      // Generate refresh token
      const refreshToken = generateJWT({
        userId: authenticatedUser.id,
        type: 'refresh'
      }, config.jwt.refreshExpiresIn);

      auth.info('User login successful', {
        userId: authenticatedUser.id,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        ip: req.ip
      });

      res.json(createResponse(
        true,
        {
          user: authenticatedUser,
          token,
          refreshToken,
          expiresIn: config.jwt.expiresIn
        },
        'Login successful'
      ));
    } catch (error) {
      // Increment failed login attempts
      await User.incrementLoginAttempts(user.id);
      
      auth.warn('Login failed - invalid credentials', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      throw AuthenticationError.invalidCredentials();
    }
  });

  /**
   * Refresh access token
   */
  refreshToken = asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new ValidationError('Refresh token is required');
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refresh_token, config.jwt.secret);
      
      if (decoded.type !== 'refresh') {
        throw AuthenticationError.invalidToken();
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw AuthenticationError.invalidToken();
      }

      // Generate new access token
      const newToken = generateJWT({
        userId: user.id,
        email: user.email,
        role: user.role,
        building_id: user.building_id
      });

      auth.info('Token refreshed successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.json(createResponse(
        true,
        {
          token: newToken,
          expiresIn: config.jwt.expiresIn
        },
        'Token refreshed successfully'
      ));
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw AuthenticationError.tokenExpired();
      }
      throw AuthenticationError.invalidToken();
    }
  });

  /**
   * Logout user
   */
  logout = asyncHandler(async (req, res) => {
    // In a stateless JWT system, logout is handled client-side
    // But we can log the logout event
    auth.info('User logout', {
      userId: req.user?.id,
      email: req.user?.email,
      ip: req.ip
    });

    res.json(createResponse(
      true,
      null,
      'Logged out successfully'
    ));
  });

  /**
   * Get current user profile
   */
  getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get user statistics
    const userStats = await User.getUserStats(req.user.id);

    // Remove password from response
    const { password_hash, ...userResponse } = user;

    res.json(createResponse(
      true,
      {
        user: userResponse,
        stats: userStats
      },
      'Profile retrieved successfully'
    ));
  });

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const { first_name, last_name, phone, apartment_number } = req.body;

    const updateData = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (phone) updateData.phone = phone;
    if (apartment_number) updateData.apartment_number = apartment_number;

    const updatedUser = await User.update(req.user.id, updateData);
    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    // Remove password from response
    const { password_hash, ...userResponse } = updatedUser;

    auth.info('User profile updated', {
      userId: req.user.id,
      email: req.user.email,
      updatedFields: Object.keys(updateData)
    });

    res.json(createResponse(
      true,
      { user: userResponse },
      'Profile updated successfully'
    ));
  });

  /**
   * Change user password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;

    // Verify current password
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    try {
      await User.authenticate(user.email, current_password);
    } catch (error) {
      throw new ValidationError('Current password is incorrect');
    }

    // Update password
    await User.updatePassword(req.user.id, new_password);

    auth.info('Password changed successfully', {
      userId: req.user.id,
      email: req.user.email,
      ip: req.ip
    });

    res.json(createResponse(
      true,
      null,
      'Password changed successfully'
    ));
  });

  /**
   * Request password reset
   */
  requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return res.json(createResponse(
        true,
        null,
        'If an account with this email exists, a password reset link has been sent'
      ));
    }

    // Generate reset token
    const resetToken = generateJWT({
      userId: user.id,
      type: 'password_reset'
    }, '1h');

    // TODO: Send email with reset link
    // This would be implemented with the email service
    
    auth.info('Password reset requested', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    res.json(createResponse(
      true,
      null,
      'If an account with this email exists, a password reset link has been sent'
    ));
  });

  /**
   * Reset password with token
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { token, new_password } = req.body;

    try {
      // Verify reset token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      if (decoded.type !== 'password_reset') {
        throw AuthenticationError.invalidToken();
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw AuthenticationError.invalidToken();
      }

      // Update password
      await User.updatePassword(user.id, new_password);

      // Reset login attempts
      await User.resetLoginAttempts(user.id);

      auth.info('Password reset successful', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.json(createResponse(
        true,
        null,
        'Password reset successful'
      ));
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw AuthenticationError.tokenExpired();
      }
      throw AuthenticationError.invalidToken();
    }
  });

  /**
   * Verify email address
   */
  verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;

    try {
      // Verify email token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      if (decoded.type !== 'email_verification') {
        throw AuthenticationError.invalidToken();
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw AuthenticationError.invalidToken();
      }

      // Update user as verified
      await User.update(user.id, { is_verified: true });

      auth.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.json(createResponse(
        true,
        null,
        'Email verified successfully'
      ));
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw AuthenticationError.tokenExpired();
      }
      throw AuthenticationError.invalidToken();
    }
  });

  /**
   * Resend email verification
   */
  resendEmailVerification = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.is_verified) {
      throw new ValidationError('Email is already verified');
    }

    // Generate verification token
    const verificationToken = generateJWT({
      userId: user.id,
      type: 'email_verification'
    }, '24h');

    // TODO: Send verification email
    // This would be implemented with the email service

    auth.info('Email verification resent', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    res.json(createResponse(
      true,
      null,
      'Verification email sent'
    ));
  });

  /**
   * Check authentication status
   */
  checkAuth = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Remove password from response
    const { password_hash, ...userResponse } = user;

    res.json(createResponse(
      true,
      { user: userResponse },
      'Authentication verified'
    ));
  });

  /**
   * Get user permissions
   */
  getPermissions = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Define permissions based on user role
    const permissions = {
      'super_admin': ['*'], // All permissions
      'building_admin': [
        'manage_building',
        'manage_users',
        'view_analytics',
        'manage_licenses',
        'create_emergency_alerts',
        'view_all_visits',
        'manage_system_blacklist'
      ],
      'resident': [
        'create_visits',
        'manage_own_visits',
        'manage_frequent_visitors',
        'manage_visitor_bans',
        'view_own_data'
      ],
      'security': [
        'scan_qr_codes',
        'log_visitor_actions',
        'view_active_visits',
        'create_emergency_alerts',
        'view_security_logs'
      ],
      'visitor': [
        'view_own_visits'
      ]
    };

    res.json(createResponse(
      true,
      {
        permissions: permissions[user.role] || [],
        role: user.role
      },
      'Permissions retrieved successfully'
    ));
  });
}

export default new AuthController();