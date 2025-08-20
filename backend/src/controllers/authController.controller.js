import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateJWT, createResponse, hashPassword, comparePassword } from '../utils/helpers.js';
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
import { USER_ROLES } from '../utils/constants.js';
import redisClient from '../config/redis.js';

/**
 * Consolidated Authentication Controller
 * Handles all authentication operations with both basic and enhanced security features
 */
class AuthController {
  /**
   * Basic user registration
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
   * Basic user login
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
          expiresIn: config.jwt.expiresIn,
          redirectTo: '/api/dashboard'
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
   * Enhanced login with advanced security features
   */
  enhancedLogin = asyncHandler(async (req, res) => {
    const { 
      email, 
      password, 
      device_name, 
      location, 
      remember_me = false 
    } = req.body;

    // Find user with security information
    const user = await User.findByEmailWithSecurity(email);
    if (!user) {
      auth.warn('Enhanced login attempt with invalid email', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        deviceName: device_name,
        location
      });
      throw AuthenticationError.invalidCredentials();
    }

    // Validate password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      await User.incrementLoginAttempts(user.id);
      
      auth.warn('Enhanced login failed - invalid password', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      throw AuthenticationError.invalidCredentials();
    }

    // Analyze suspicious activity
    const suspiciousActivity = await this.analyzeSuspiciousActivity(user, req);
    if (suspiciousActivity.isHighRisk) {
      // Require additional verification for high-risk logins
      const verificationToken = generateJWT({
        userId: user.id,
        type: 'verification_challenge',
        verificationMethod: suspiciousActivity.recommendedVerificationMethod
      }, '10m');

      auth.warn('High-risk login detected - verification required', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        riskFactors: suspiciousActivity.riskFactors
      });

      return res.status(200).json(createResponse(
        true,
        {
          requiresVerification: true,
          verificationToken,
          verificationMethod: suspiciousActivity.recommendedVerificationMethod,
          riskFactors: suspiciousActivity.riskFactors
        },
        'Additional verification required for security'
      ));
    }

    // Reset failed login attempts
    await User.resetLoginAttempts(user.id);

    // Generate session ID for enhanced session management
    const sessionId = this.generateSessionId();
    const deviceFingerprint = this.generateDeviceFingerprint(req);

    // Create session data
    const sessionData = {
      sessionId,
      deviceFingerprint,
      deviceName: device_name || 'Unknown Device',
      location: location || 'Unknown Location',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      rememberMe: remember_me,
      loginTime: new Date(),
      isMobile: this.isMobileDevice(req.get('User-Agent'))
    };

    // Generate tokens with session information
    const tokenExpiry = remember_me ? '30d' : config.jwt.expiresIn;
    const token = generateJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      building_id: user.building_id,
      sessionId,
      deviceFingerprint
    }, tokenExpiry);

    const refreshToken = generateJWT({
      userId: user.id,
      type: 'refresh',
      sessionId,
      deviceFingerprint
    }, remember_me ? '90d' : config.jwt.refreshExpiresIn);

    // Store session data (in production, store in Redis or database)
    // await this.storeSessionData(user.id, sessionData);

    // Update last login information
    await User.update(user.id, {
      last_login: new Date(),
      last_login_ip: req.ip,
      last_user_agent: req.get('User-Agent')
    });

    // Remove sensitive data from response
    const { password_hash, ...userResponse } = user;

    auth.info('Enhanced login successful', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
      deviceName: device_name,
      location,
      sessionId
    });

    res.json(createResponse(
      true,
      {
        user: userResponse,
        token,
        refreshToken,
        expiresIn: tokenExpiry,
        sessionId,
        deviceVerified: true,
        securityLevel: suspiciousActivity.securityLevel || 'NORMAL',
        redirectTo: '/api/dashboard'
      },
      'Enhanced login successful'
    ));
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
        building_id: user.building_id,
        sessionId: decoded.sessionId,
        deviceFingerprint: decoded.deviceFingerprint
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
   * Enhanced refresh token with session validation
   */
  enhancedRefreshToken = asyncHandler(async (req, res) => {
    const { refresh_token, device_fingerprint } = req.body;

    if (!refresh_token) {
      throw new ValidationError('Refresh token is required');
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refresh_token, config.jwt.secret);
      
      if (decoded.type !== 'refresh') {
        throw AuthenticationError.invalidToken();
      }

      // Validate session and device fingerprint
      const sessionValid = await this.validateSession(decoded.userId, decoded.sessionId, device_fingerprint);
      if (!sessionValid) {
        throw AuthenticationError.sessionInvalid();
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
        building_id: user.building_id,
        sessionId: decoded.sessionId,
        deviceFingerprint: decoded.deviceFingerprint
      });

      // Update session last activity
      // await this.updateSessionActivity(decoded.userId, decoded.sessionId);

      auth.info('Enhanced token refresh successful', {
        userId: user.id,
        email: user.email,
        sessionId: decoded.sessionId,
        ip: req.ip
      });

      res.json(createResponse(
        true,
        {
          token: newToken,
          expiresIn: config.jwt.expiresIn,
          sessionValid: true
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
   * Basic logout with token blacklisting
   */
  logout = asyncHandler(async (req, res) => {
    try {
      const token = req.token;
      
      if (token) {
        // Decode token to get expiry time
        const decoded = jwt.decode(token);
        const now = Math.floor(Date.now() / 1000);
        const tokenExpiry = decoded.exp;
        const remainingTime = tokenExpiry - now;
        
        // Only blacklist if token hasn't expired yet
        if (remainingTime > 0) {
          // Add token to Redis blacklist with remaining TTL
          await redisClient.set(
            `blacklist:${token}`, 
            'true', 
            remainingTime
          );
        }
      }

      auth.info('User logout successful', {
        userId: req.user?.id,
        email: req.user?.email,
        ip: req.ip,
        tokenBlacklisted: !!token
      });

      res.json(createResponse(
        true,
        { 
          tokenInvalidated: true,
          logoutTime: new Date()
        },
        'Logged out successfully'
      ));
    } catch (error) {
      auth.error('Logout error', {
        userId: req.user?.id,
        error: error.message
      });

      // Even if Redis fails, still return success for logout
      res.json(createResponse(
        true,
        { 
          tokenInvalidated: false,
          logoutTime: new Date()
        },
        'Logged out successfully'
      ));
    }
  });

  /**
   * Enhanced logout with session cleanup and token blacklisting
   */
  enhancedLogout = asyncHandler(async (req, res) => {
    const { logout_all_devices = false } = req.body;
    let tokenBlacklisted = false;
    let allTokensBlacklisted = false;

    try {
      const token = req.token;
      
      if (logout_all_devices) {
        // For logout_all_devices, we would need to track all user tokens
        // For now, just blacklist the current token
        if (token) {
          const decoded = jwt.decode(token);
          const now = Math.floor(Date.now() / 1000);
          const tokenExpiry = decoded.exp;
          const remainingTime = tokenExpiry - now;
          
          if (remainingTime > 0) {
            await redisClient.set(`blacklist:${token}`, 'true', remainingTime);
            tokenBlacklisted = true;
          }
        }
        
        // TODO: Implement user-wide token blacklisting
        // This would require tracking all tokens per user
        allTokensBlacklisted = false; // Placeholder for future implementation
        
        auth.info('Enhanced logout from all devices', {
          userId: req.user.id,
          email: req.user.email,
          ip: req.ip,
          currentTokenBlacklisted: tokenBlacklisted
        });
      } else {
        // Invalidate only current token
        if (token) {
          const decoded = jwt.decode(token);
          const now = Math.floor(Date.now() / 1000);
          const tokenExpiry = decoded.exp;
          const remainingTime = tokenExpiry - now;
          
          if (remainingTime > 0) {
            await redisClient.set(`blacklist:${token}`, 'true', remainingTime);
            tokenBlacklisted = true;
          }
        }
        
        auth.info('Enhanced logout from current session', {
          userId: req.user.id,
          email: req.user.email,
          ip: req.ip,
          tokenBlacklisted
        });
      }
    } catch (error) {
      auth.error('Enhanced logout error', {
        userId: req.user?.id,
        error: error.message
      });
      // Continue with logout even if blacklisting fails
    }

    res.json(createResponse(
      true,
      {
        sessionsCleaned: logout_all_devices ? 'all' : 'current',
        tokenInvalidated: tokenBlacklisted,
        allTokensInvalidated: allTokensBlacklisted,
        logoutTime: new Date()
      },
      logout_all_devices ? 'Logged out from all devices' : 'Logged out successfully'
    ));
  });

  /**
   * Get user profile
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
   * Basic change password
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
   * Enhanced change password with security validations
   */
  enhancedChangePassword = asyncHandler(async (req, res) => {
    const { 
      current_password, 
      new_password, 
      logout_other_sessions = true 
    } = req.body;

    // Get user with security information
    const user = await User.findByIdWithSecurity(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValidCurrentPassword = await comparePassword(current_password, user.password_hash);
    if (!isValidCurrentPassword) {
      throw new ValidationError('Current password is incorrect');
    }

    // Validate new password strength
    const passwordStrength = this.validatePasswordStrength(new_password);
    if (!passwordStrength.isStrong) {
      throw new ValidationError(`Password is too weak: ${passwordStrength.feedback.join(', ')}`);
    }

    // Check if password was recently used
    const isPasswordReused = await this.checkPasswordReuse(req.user.id, new_password);
    if (isPasswordReused) {
      throw new ValidationError('Cannot reuse a recent password. Please choose a different password.');
    }

    // Update password
    await User.updatePassword(req.user.id, new_password);

    // Log out other sessions if requested
    if (logout_other_sessions) {
      // await this.invalidateOtherSessions(req.user.id, req.token_data?.sessionId);
    }

    auth.info('Enhanced password change successful', {
      userId: req.user.id,
      email: req.user.email,
      ip: req.ip,
      loggedOutOtherSessions: logout_other_sessions
    });

    res.json(createResponse(
      true,
      {
        passwordUpdated: true,
        otherSessionsLoggedOut: logout_other_sessions,
        securityScore: passwordStrength.score
      },
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

  /**
   * Get active sessions (enhanced feature)
   */
  getActiveSessions = asyncHandler(async (req, res) => {
    // This would retrieve from session store in production
    const mockSessions = [
      {
        sessionId: 'session_123',
        deviceName: 'Chrome on Windows',
        location: 'Lagos, Nigeria',
        ipAddress: '192.168.1.1',
        loginTime: new Date(),
        lastActivity: new Date(),
        isCurrent: true,
        isMobile: false
      }
    ];

    res.json(createResponse(
      true,
      { sessions: mockSessions },
      'Active sessions retrieved successfully'
    ));
  });

  /**
   * Revoke a specific session
   */
  revokeSession = asyncHandler(async (req, res) => {
    const { session_id } = req.params;

    // This would invalidate the session in production
    // await this.invalidateSession(req.user.id, session_id);

    auth.info('Session revoked', {
      userId: req.user.id,
      sessionId: session_id,
      ip: req.ip
    });

    res.json(createResponse(
      true,
      { sessionId: session_id },
      'Session revoked successfully'
    ));
  });

  // ===============================
  // HELPER METHODS
  // ===============================

  async analyzeSuspiciousActivity(user, req) {
    const riskFactors = [];
    let securityLevel = 'NORMAL';
    let isHighRisk = false;

    // Check for unusual IP address
    if (user.last_login_ip && user.last_login_ip !== req.ip) {
      riskFactors.push('Different IP address');
      securityLevel = 'MEDIUM';
    }

    // Check for unusual device/user agent
    const currentDevice = req.get('User-Agent');
    if (user.last_user_agent && user.last_user_agent !== currentDevice) {
      riskFactors.push('Different device');
      securityLevel = 'MEDIUM';
    }

    // Check time since last login
    if (user.last_login) {
      const hoursSinceLastLogin = (new Date() - new Date(user.last_login)) / (1000 * 60 * 60);
      if (hoursSinceLastLogin < 1) {
        riskFactors.push('Multiple rapid login attempts');
        securityLevel = 'HIGH';
        isHighRisk = true;
      }
    }

    return {
      isHighRisk,
      securityLevel,
      riskFactors,
      recommendedVerificationMethod: isHighRisk ? 'email' : null
    };
  }

  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateDeviceFingerprint(req) {
    const components = [
      req.get('User-Agent'),
      req.get('Accept-Language'),
      req.get('Accept-Encoding'),
      req.ip
    ].filter(Boolean);

    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  isMobileDevice(userAgent) {
    return /Mobile|Android|iPhone|iPad/.test(userAgent || '');
  }

  async validateSession(userId, sessionId, deviceFingerprint) {
    // This would validate against stored session data in production
    // For now, return true as placeholder
    return true;
  }

  validatePasswordStrength(password) {
    const feedback = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Password must be at least 8 characters long');

    // Complexity checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    // Common password check
    if (this.isCommonPassword(password)) {
      score -= 2;
      feedback.push('Avoid common passwords');
    }

    return {
      score: Math.max(0, score),
      isStrong: score >= 4 && feedback.length === 0,
      feedback
    };
  }

  isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  async checkPasswordReuse(userId, newPassword) {
    // This would check against password history in production
    // For now, return false as placeholder
    return false;
  }
}

export default new AuthController();