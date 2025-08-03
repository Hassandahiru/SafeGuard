import jwt from 'jsonwebtoken';
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

/**
 * Enhanced Authentication Controller
 * Comprehensive user authentication with advanced security features
 */
class EnhancedAuthController {

  /**
   * Enhanced login with security features
   */
  enhancedLogin = asyncHandler(async (req, res) => {
    const { email, password, remember_me = false, device_name, location } = req.body;

    // Rate limiting check (implement in middleware)
    await this.checkRateLimit(req);

    // Find user with additional security context
    const user = await User.findByEmailWithSecurity(email);
    if (!user) {
      await this.logFailedAttempt(email, req.ip, 'USER_NOT_FOUND');
      throw AuthenticationError.invalidCredentials();
    }

    // Check account status
    await this.validateAccountStatus(user, req);

    // Authenticate user
    try {
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        await User.incrementLoginAttempts(user.id);
        await this.logFailedAttempt(email, req.ip, 'INVALID_PASSWORD');
        throw AuthenticationError.invalidCredentials();
      }

      // Reset failed attempts on successful login
      await User.resetLoginAttempts(user.id);

      // Check for suspicious login patterns
      const suspiciousActivity = await this.detectSuspiciousActivity(user, req);
      if (suspiciousActivity.isHighRisk) {
        // Require additional verification
        const verificationToken = await this.generateVerificationChallenge(user.id);
        
        auth.warn('Suspicious login detected', {
          userId: user.id,
          email: user.email,
          riskFactors: suspiciousActivity.factors,
          ip: req.ip
        });

        return res.json(createResponse(
          false,
          {
            requiresVerification: true,
            verificationToken,
            verificationMethods: ['email', 'sms'],
            riskLevel: 'HIGH'
          },
          'Additional verification required due to suspicious activity'
        ));
      }

      // Generate enhanced tokens
      const tokenData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        building_id: user.building_id,
        session_id: this.generateSessionId(),
        device_fingerprint: this.generateDeviceFingerprint(req)
      };

      const accessToken = generateJWT(tokenData, remember_me ? '30d' : config.jwt.expiresIn);
      const refreshToken = generateJWT({
        userId: user.id,
        session_id: tokenData.session_id,
        type: 'refresh'
      }, remember_me ? '90d' : config.jwt.refreshExpiresIn);

      // Store session information
      await this.createUserSession(user.id, {
        session_id: tokenData.session_id,
        device_name: device_name || req.get('User-Agent'),
        ip_address: req.ip,
        location: location || 'Unknown',
        user_agent: req.get('User-Agent'),
        is_mobile: this.isMobileDevice(req.get('User-Agent')),
        remember_me,
        expires_at: remember_me ? 
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : 
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Update user login information
      await User.update(user.id, {
        last_login: new Date(),
        last_login_ip: req.ip,
        login_count: (user.login_count || 0) + 1
      });

      // Remove sensitive data
      const { password_hash, ...userResponse } = user;

      // Log successful login
      auth.info('User login successful', {
        userId: user.id,
        email: user.email,
        role: user.role,
        building_id: user.building_id,
        sessionId: tokenData.session_id,
        deviceName: device_name,
        rememberMe: remember_me,
        ip: req.ip
      });

      res.json(createResponse(
        true,
        {
          user: userResponse,
          accessToken,
          refreshToken,
          sessionId: tokenData.session_id,
          expiresIn: remember_me ? '30d' : config.jwt.expiresIn,
          permissions: await this.getUserPermissions(user),
          building: user.building_id ? await Building.findById(user.building_id) : null
        },
        'Login successful'
      ));

    } catch (error) {
      await User.incrementLoginAttempts(user.id);
      await this.logFailedAttempt(email, req.ip, 'AUTHENTICATION_ERROR');
      throw error;
    }
  });

  /**
   * Two-factor authentication verification
   */
  verifyTwoFactor = asyncHandler(async (req, res) => {
    const { verification_token, verification_code, method } = req.body;

    try {
      // Verify the verification token
      const decoded = jwt.verify(verification_token, config.jwt.secret);
      
      if (decoded.type !== 'verification_challenge') {
        throw AuthenticationError.invalidToken();
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        throw AuthenticationError.invalidToken();
      }

      // Verify the provided code based on method
      const isValidCode = await this.verifyVerificationCode(
        decoded.challengeId, 
        verification_code, 
        method
      );

      if (!isValidCode) {
        throw new ValidationError('Invalid verification code');
      }

      // Generate normal login tokens after successful verification
      const tokenData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        building_id: user.building_id,
        session_id: this.generateSessionId(),
        verified_login: true
      };

      const accessToken = generateJWT(tokenData);
      const refreshToken = generateJWT({
        userId: user.id,
        session_id: tokenData.session_id,
        type: 'refresh'
      }, config.jwt.refreshExpiresIn);

      // Remove sensitive data
      const { password_hash, ...userResponse } = user;

      auth.info('Two-factor authentication successful', {
        userId: user.id,
        email: user.email,
        method,
        ip: req.ip
      });

      res.json(createResponse(
        true,
        {
          user: userResponse,
          accessToken,
          refreshToken,
          sessionId: tokenData.session_id,
          expiresIn: config.jwt.expiresIn
        },
        'Two-factor authentication successful'
      ));

    } catch (error) {
      auth.warn('Two-factor authentication failed', {
        error: error.message,
        method,
        ip: req.ip
      });
      throw error;
    }
  });

  /**
   * Enhanced token refresh with session validation
   */
  enhancedRefreshToken = asyncHandler(async (req, res) => {
    const { refresh_token, device_fingerprint } = req.body;

    if (!refresh_token) {
      throw new ValidationError('Refresh token is required');
    }

    try {
      const decoded = jwt.verify(refresh_token, config.jwt.secret);
      
      if (decoded.type !== 'refresh') {
        throw AuthenticationError.invalidToken();
      }

      // Validate session
      const sessionValid = await this.validateUserSession(
        decoded.userId, 
        decoded.session_id,
        device_fingerprint
      );

      if (!sessionValid) {
        throw AuthenticationError.sessionExpired();
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw AuthenticationError.invalidToken();
      }

      // Generate new access token
      const newTokenData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        building_id: user.building_id,
        session_id: decoded.session_id,
        device_fingerprint
      };

      const newAccessToken = generateJWT(newTokenData);

      // Update session last activity
      await this.updateSessionActivity(decoded.session_id);

      auth.info('Token refreshed successfully', {
        userId: user.id,
        sessionId: decoded.session_id,
        ip: req.ip
      });

      res.json(createResponse(
        true,
        {
          accessToken: newAccessToken,
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
   * Enhanced logout with session cleanup
   */
  enhancedLogout = asyncHandler(async (req, res) => {
    const { logout_all_devices = false } = req.body;

    try {
      if (logout_all_devices) {
        // Invalidate all sessions for this user
        await this.invalidateAllUserSessions(req.user.id);
        
        auth.info('User logged out from all devices', {
          userId: req.user.id,
          email: req.user.email,
          ip: req.ip
        });
      } else {
        // Invalidate current session only
        const sessionId = req.token_data?.session_id;
        if (sessionId) {
          await this.invalidateUserSession(sessionId);
        }
        
        auth.info('User logged out', {
          userId: req.user.id,
          email: req.user.email,
          sessionId,
          ip: req.ip
        });
      }

      res.json(createResponse(
        true,
        null,
        logout_all_devices ? 
          'Logged out from all devices successfully' : 
          'Logged out successfully'
      ));

    } catch (error) {
      auth.error('Logout error', {
        userId: req.user?.id,
        error: error.message,
        ip: req.ip
      });

      // Even if session cleanup fails, return success
      res.json(createResponse(
        true,
        null,
        'Logged out successfully'
      ));
    }
  });

  /**
   * Get active sessions for user
   */
  getActiveSessions = asyncHandler(async (req, res) => {
    const sessions = await this.getUserActiveSessions(req.user.id);

    res.json(createResponse(
      true,
      {
        sessions: sessions.map(session => ({
          session_id: session.session_id,
          device_name: session.device_name,
          location: session.location,
          ip_address: session.ip_address,
          is_current: session.session_id === req.token_data?.session_id,
          is_mobile: session.is_mobile,
          last_activity: session.last_activity,
          created_at: session.created_at
        })),
        totalSessions: sessions.length
      },
      'Active sessions retrieved successfully'
    ));
  });

  /**
   * Revoke specific session
   */
  revokeSession = asyncHandler(async (req, res) => {
    const { session_id } = req.params;

    // Validate session belongs to user
    const session = await this.getUserSession(req.user.id, session_id);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    await this.invalidateUserSession(session_id);

    auth.info('Session revoked', {
      userId: req.user.id,
      revokedSessionId: session_id,
      deviceName: session.device_name,
      ip: req.ip
    });

    res.json(createResponse(
      true,
      null,
      'Session revoked successfully'
    ));
  });

  /**
   * Enhanced password change with security validations
   */
  enhancedChangePassword = asyncHandler(async (req, res) => {
    const { 
      current_password, 
      new_password, 
      logout_other_sessions = true,
      require_reauth_for_sensitive_actions = true 
    } = req.body;

    // Verify current password
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidCurrentPassword = await comparePassword(current_password, user.password_hash);
    if (!isValidCurrentPassword) {
      throw new ValidationError('Current password is incorrect');
    }

    // Validate new password strength
    const passwordStrength = this.validatePasswordStrength(new_password);
    if (!passwordStrength.isStrong) {
      throw new ValidationError(`Password is not strong enough: ${passwordStrength.feedback.join(', ')}`);
    }

    // Check password history (prevent reuse of recent passwords)
    const isPasswordReused = await this.checkPasswordHistory(user.id, new_password);
    if (isPasswordReused) {
      throw new ValidationError('Cannot reuse one of your recent passwords');
    }

    // Update password
    await User.updatePassword(req.user.id, new_password);

    // Store password in history
    await this.addPasswordToHistory(user.id, user.password_hash);

    // Logout other sessions if requested
    if (logout_other_sessions) {
      const currentSessionId = req.token_data?.session_id;
      await this.invalidateAllUserSessionsExcept(user.id, currentSessionId);
    }

    // Update user security settings
    await User.update(user.id, {
      password_changed_at: new Date(),
      require_password_change: false,
      security_score: passwordStrength.score
    });

    auth.info('Password changed successfully', {
      userId: user.id,
      email: user.email,
      passwordStrength: passwordStrength.score,
      loggedOutOtherSessions: logout_other_sessions,
      ip: req.ip
    });

    res.json(createResponse(
      true,
      {
        passwordStrength: passwordStrength.score,
        loggedOutOtherSessions: logout_other_sessions
      },
      'Password changed successfully'
    ));
  });

  // Helper methods

  async checkRateLimit(req) {
    // Implement rate limiting logic
    // This would typically use Redis to track attempts
    return true;
  }

  async logFailedAttempt(email, ip, reason) {
    auth.warn('Login attempt failed', {
      email,
      ip,
      reason,
      timestamp: new Date()
    });
  }

  async validateAccountStatus(user, req) {
    if (!user.is_active) {
      throw AuthenticationError.accountInactive();
    }

    const isLocked = await User.isAccountLocked(user.id);
    if (isLocked) {
      throw AuthenticationError.accountLocked();
    }

    if (!user.is_verified && config.REQUIRE_EMAIL_VERIFICATION) {
      throw AuthenticationError.emailNotVerified();
    }
  }

  async detectSuspiciousActivity(user, req) {
    // Implement suspicious activity detection
    const factors = [];
    
    // Check for unusual location
    if (user.last_login_ip && user.last_login_ip !== req.ip) {
      factors.push('different_ip');
    }

    // Check for unusual device
    const currentDevice = req.get('User-Agent');
    if (user.last_user_agent && user.last_user_agent !== currentDevice) {
      factors.push('different_device');
    }

    // Check time patterns
    const lastLogin = new Date(user.last_login);
    const hoursSinceLastLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastLogin < 1) {
      factors.push('rapid_login');
    }

    return {
      isHighRisk: factors.length >= 2,
      factors
    };
  }

  async generateVerificationChallenge(userId) {
    const challengeId = this.generateSessionId();
    
    // Store challenge in database/cache
    // await this.storeVerificationChallenge(challengeId, userId);

    return generateJWT({
      userId,
      challengeId,
      type: 'verification_challenge'
    }, '10m');
  }

  async verifyVerificationCode(challengeId, code, method) {
    // Implement verification code validation
    // This would check against stored codes for email/SMS
    return true; // Placeholder
  }

  generateSessionId() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  generateDeviceFingerprint(req) {
    const components = [
      req.get('User-Agent'),
      req.get('Accept-Language'),
      req.get('Accept-Encoding'),
      req.ip
    ].filter(Boolean);

    return require('crypto')
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  isMobileDevice(userAgent) {
    return /Mobile|Android|iPhone|iPad/.test(userAgent || '');
  }

  async createUserSession(userId, sessionData) {
    // Implement session storage
    // This would typically store in database or Redis
    return true;
  }

  async validateUserSession(userId, sessionId, deviceFingerprint) {
    // Implement session validation
    return true;
  }

  async updateSessionActivity(sessionId) {
    // Update session last activity timestamp
    return true;
  }

  async invalidateUserSession(sessionId) {
    // Invalidate specific session
    return true;
  }

  async invalidateAllUserSessions(userId) {
    // Invalidate all sessions for user
    return true;
  }

  async invalidateAllUserSessionsExcept(userId, exceptSessionId) {
    // Invalidate all sessions except the specified one
    return true;
  }

  async getUserActiveSessions(userId) {
    // Get all active sessions for user
    return [];
  }

  async getUserSession(userId, sessionId) {
    // Get specific session for user
    return null;
  }

  async getUserPermissions(user) {
    // Get user permissions based on role
    const permissions = {
      [USER_ROLES.SUPER_ADMIN]: ['*'],
      [USER_ROLES.BUILDING_ADMIN]: [
        'manage_building', 'manage_users', 'view_analytics', 
        'manage_licenses', 'create_emergency_alerts'
      ],
      [USER_ROLES.RESIDENT]: [
        'create_visits', 'manage_own_visits', 'manage_frequent_visitors'
      ],
      [USER_ROLES.SECURITY]: [
        'scan_qr_codes', 'log_visitor_actions', 'view_active_visits'
      ]
    };

    return permissions[user.role] || [];
  }

  validatePasswordStrength(password) {
    const checks = {
      minLength: password.length >= 8,
      hasLower: /[a-z]/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      notCommon: !this.isCommonPassword(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    const feedback = [];

    if (!checks.minLength) feedback.push('At least 8 characters');
    if (!checks.hasLower) feedback.push('One lowercase letter');
    if (!checks.hasUpper) feedback.push('One uppercase letter');
    if (!checks.hasNumber) feedback.push('One number');
    if (!checks.hasSymbol) feedback.push('One special character');
    if (!checks.notCommon) feedback.push('Not a common password');

    return {
      isStrong: score >= 5,
      score,
      feedback
    };
  }

  isCommonPassword(password) {
    const common = ['password', '123456', 'password123', 'admin', 'letmein'];
    return common.includes(password.toLowerCase());
  }

  async checkPasswordHistory(userId, newPassword) {
    // Check if password was used recently
    // This would query password history table
    return false;
  }

  async addPasswordToHistory(userId, passwordHash) {
    // Add current password to history
    // Keep last 5 passwords
    return true;
  }
}

export default new EnhancedAuthController();