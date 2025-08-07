import User from '../models/User.js';
import Building from '../models/Building.js';
import { generateJWT, createResponse, hashPassword } from '../utils/helpers.js';
import { auth } from '../utils/logger.js';
import { 
  AuthenticationError, 
  ValidationError, 
  ConflictError, 
  NotFoundError 
} from '../utils/errors/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { USER_ROLES } from '../utils/constants.js';
import config from '../config/environment.js';

/**
 * Enhanced User Registration Controller
 * Handles comprehensive user creation workflows with security features
 */
class UserRegistrationController {

  /**
   * Multi-step user registration workflow
   * Step 1: Validate building and availability
   */
  validateRegistration = asyncHandler(async (req, res) => {
    const { building_id, email, phone, role = USER_ROLES.RESIDENT } = req.body;

    // Validate building exists and is active
    const building = await Building.findById(building_id);
    if (!building || !building.is_active) {
      throw new NotFoundError('Building not found or inactive');
    }

    // Check if building has available licenses
    const usesLicense = [USER_ROLES.RESIDENT, USER_ROLES.BUILDING_ADMIN].includes(role);
    if (usesLicense) {
      const hasLicenses = await Building.hasAvailableLicenses(building_id);
      if (!hasLicenses) {
        throw new ConflictError('Building has reached its license limit');
      }
    }

    // Check email availability
    const existingEmailUser = await User.findByEmail(email);
    if (existingEmailUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Check phone availability
    if (phone) {
      const existingPhoneUser = await User.findByPhone(phone);
      if (existingPhoneUser) {
        throw new ConflictError('User with this phone number already exists');
      }
    }

    // Get building license utilization for frontend display
    const licenseUtilization = await Building.getLicenseUtilization(building_id);

    res.json(createResponse(
      true,
      {
        building: {
          id: building.id,
          name: building.name,
          address: building.address
        },
        licenseUtilization,
        canRegister: true,
        usesLicense
      },
      'Registration validation successful'
    ));
  });

  /**
   * Complete user registration
   * Step 2: Create user account with full validation
   */
  completeRegistration = asyncHandler(async (req, res) => {
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      building_id, 
      role = USER_ROLES.RESIDENT,
      apartment_number,
      emergency_contact,
      agreed_to_terms = false,
      email_notifications = true,
      sms_notifications = false
    } = req.body;

    // Validate terms agreement
    if (!agreed_to_terms) {
      throw new ValidationError('You must agree to the terms and conditions');
    }

    // Re-validate building and license availability
    const building = await Building.findById(building_id);
    if (!building || !building.is_active) {
      throw new NotFoundError('Building not found or inactive');
    }

    const usesLicense = [USER_ROLES.RESIDENT, USER_ROLES.BUILDING_ADMIN].includes(role);
    if (usesLicense && !await Building.hasAvailableLicenses(building_id)) {
      throw new ConflictError('Building has reached its license limit');
    }

    // Check for duplicate email/phone again (race condition protection)
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    if (phone) {
      const existingPhone = await User.findByPhone(phone);
      if (existingPhone) {
        throw new ConflictError('User with this phone number already exists');
      }
    }

    // Create user with enhanced data
    const userData = {
      email,
      password,
      first_name,
      last_name,
      phone,
      building_id,
      role,
      apartment_number,
      emergency_contact: emergency_contact || {},
      preferences: {
        email_notifications,
        sms_notifications,
        language: 'en',
        timezone: building.timezone || 'UTC'
      },
      uses_license: usesLicense,
      is_active: true,
      is_verified: config.NODE_ENV === 'development', // Auto-verify in development
      registration_ip: req.ip,
      registration_user_agent: req.get('User-Agent')
    };

    const user = await User.create(userData);

    // Update building license count if user uses license
    if (usesLicense) {
      await Building.updateLicenseUsage(building_id, 1);
    }

    // Generate tokens
    const token = generateJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      building_id: user.building_id
    });

    const refreshToken = generateJWT({
      userId: user.id,
      type: 'refresh'
    }, config.jwt.refreshExpiresIn);

    // Generate email verification token if needed
    let verificationToken = null;
    if (!user.is_verified) {
      verificationToken = generateJWT({
        userId: user.id,
        type: 'email_verification'
      }, '24h');
      
      // TODO: Send verification email
      // await emailService.sendVerificationEmail(user.email, verificationToken);
    }

    // Remove sensitive data from response
    const { password_hash, ...userResponse } = user;

    auth.info('User registration completed', {
      userId: user.id,
      email: user.email,
      role: user.role,
      building_id: user.building_id,
      usesLicense,
      ip: req.ip
    });

    res.status(201).json(createResponse(
      true,
      {
        user: userResponse,
        token,
        refreshToken,
        verificationToken,
        expiresIn: config.jwt.expiresIn,
        needsEmailVerification: !user.is_verified
      },
      'User registered successfully'
    ));
  });

  /**
   * Resident self-registration (limited version)
   */
  residentSelfRegister = asyncHandler(async (req, res) => {
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      building_email, // Instead of building_id for security
      apartment_number,
      emergency_contact_name,
      emergency_contact_phone
    } = req.body;

    // Find building by building email
    const building = await Building.findByEmail(building_email);
    
    if (!building) {
      throw new NotFoundError('Invalid building email or self-registration not allowed');
    }

    // Check license availability
    if (!await Building.hasAvailableLicenses(building.id)) {
      throw new ConflictError('Building has reached its license limit');
    }

    // Validate no existing users
    const [existingEmail, existingPhone] = await Promise.all([
      User.findByEmail(email),
      phone ? User.findByPhone(phone) : null
    ]);

    if (existingEmail) {
      throw new ConflictError('User with this email already exists');
    }
    if (existingPhone) {
      throw new ConflictError('User with this phone number already exists');
    }

    // Create user with resident role
    const userData = {
      email,
      password,
      first_name,
      last_name,
      phone,
      building_id: building.id,
      role: USER_ROLES.RESIDENT,
      apartment_number,
      emergency_contact: {
        name: emergency_contact_name,
        phone: emergency_contact_phone
      },
      preferences: {
        email_notifications: true,
        sms_notifications: false,
        language: 'en'
      },
      uses_license: true,
      is_active: false, // Requires admin approval for self-registration
      is_verified: false
    };

    const user = await User.create(userData);

    // Update license count (even for inactive users to prevent overselling)
    await Building.updateLicenseUsage(building.id, 1);

    // Create approval request for building admin
    // TODO: Implement approval request system

    // Remove sensitive data
    const { password_hash, ...userResponse } = user;

    auth.info('Resident self-registration completed', {
      userId: user.id,
      email: user.email,
      building_id: building.id,
      status: 'pending_approval',
      ip: req.ip
    });

    res.status(201).json(createResponse(
      true,
      {
        user: userResponse,
        status: 'pending_approval',
        message: 'Registration submitted successfully. Please wait for admin approval.'
      },
      'Registration pending approval'
    ));
  });

  /**
   * Building admin registration (by super admin)
   */
  registerBuildingAdmin = asyncHandler(async (req, res) => {
    // Ensure only super admins can create building admins
    if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
      throw new AuthenticationError('Only super admins can register building admins');
    }

    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      building_id,
      apartment_number,
      admin_permissions = [],
      send_welcome_email = true
    } = req.body;

    // Validate building
    const building = await Building.findById(building_id);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    // Check license availability
    if (!await Building.hasAvailableLicenses(building_id)) {
      throw new ConflictError('Building has reached its license limit');
    }

    // Check for existing admin in this building
    const existingAdmins = await User.getBuildingAdmins(building_id);
    if (existingAdmins.length >= building.max_admins || 3) { // Default max 3 admins
      throw new ConflictError('Building has reached maximum number of admins');
    }

    // Validate unique email/phone
    const [existingEmail, existingPhone] = await Promise.all([
      User.findByEmail(email),
      phone ? User.findByPhone(phone) : null
    ]);

    if (existingEmail) {
      throw new ConflictError('User with this email already exists');
    }
    if (existingPhone) {
      throw new ConflictError('User with this phone number already exists');
    }

    // Create building admin
    const userData = {
      email,
      password,
      first_name,
      last_name,
      phone,
      building_id,
      role: USER_ROLES.BUILDING_ADMIN,
      apartment_number,
      admin_permissions,
      preferences: {
        email_notifications: true,
        sms_notifications: true,
        dashboard_theme: 'dark'
      },
      uses_license: true,
      is_active: true,
      is_verified: true, // Admins are auto-verified
      created_by: req.user.id,
      registration_method: 'admin_created'
    };

    const admin = await User.create(userData);
    await Building.updateLicenseUsage(building_id, 1);

    // Generate welcome credentials
    const temporaryPassword = password; // In production, generate a temporary password
    const welcomeToken = generateJWT({
      userId: admin.id,
      type: 'welcome_setup'
    }, '7d');

    // TODO: Send welcome email with setup instructions
    if (send_welcome_email) {
      // await emailService.sendWelcomeEmail(admin.email, temporaryPassword, welcomeToken);
    }

    const { password_hash, ...adminResponse } = admin;

    auth.info('Building admin registered', {
      adminId: admin.id,
      building_id,
      createdBy: req.user.id,
      ip: req.ip
    });

    res.status(201).json(createResponse(
      true,
      {
        admin: adminResponse,
        welcomeToken,
        building: {
          id: building.id,
          name: building.name
        }
      },
      'Building admin registered successfully'
    ));
  });

  /**
   * Security personnel registration
   */
  registerSecurity = asyncHandler(async (req, res) => {
    // Only super admins and building admins can create security accounts
    if (![USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN].includes(req.user.role)) {
      throw new AuthenticationError('Insufficient permissions');
    }

    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      building_id,
      security_level = 1,
      shift_schedule = [],
      security_clearance = 'basic'
    } = req.body;

    // Building admin can only create security for their building
    if (req.user.role === USER_ROLES.BUILDING_ADMIN && req.user.building_id !== building_id) {
      throw new AuthenticationError('Can only create security for your building');
    }

    // Validate building
    const building = await Building.findById(building_id);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    // Security doesn't use licenses, but validate building capacity
    const existingSecurity = await User.getBuildingSecurity(building_id);
    if (existingSecurity.length >= (building.max_security || 10)) {
      throw new ConflictError('Building has reached maximum security personnel limit');
    }

    // Validate unique email/phone
    const [existingEmail, existingPhone] = await Promise.all([
      User.findByEmail(email),
      phone ? User.findByPhone(phone) : null
    ]);

    if (existingEmail) {
      throw new ConflictError('User with this email already exists');
    }
    if (existingPhone) {
      throw new ConflictError('User with this phone number already exists');
    }

    // Create security user
    const userData = {
      email,
      password,
      first_name,
      last_name,
      phone,
      building_id,
      role: USER_ROLES.SECURITY,
      security_level,
      shift_schedule,
      security_clearance,
      preferences: {
        email_notifications: true,
        sms_notifications: true,
        mobile_app_notifications: true
      },
      uses_license: false,
      is_active: true,
      is_verified: true,
      created_by: req.user.id,
      registration_method: 'admin_created'
    };

    const security = await User.create(userData);

    const { password_hash, ...securityResponse } = security;

    auth.info('Security personnel registered', {
      securityId: security.id,
      building_id,
      security_level,
      createdBy: req.user.id,
      ip: req.ip
    });

    res.status(201).json(createResponse(
      true,
      {
        security: securityResponse,
        building: {
          id: building.id,
          name: building.name
        }
      },
      'Security personnel registered successfully'
    ));
  });

  /**
   * Bulk user registration (CSV import)
   */
  bulkRegister = asyncHandler(async (req, res) => {
    // Only super admins and building admins can do bulk registration
    if (![USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN].includes(req.user.role)) {
      throw new AuthenticationError('Insufficient permissions');
    }

    const { users, building_id, default_password, send_welcome_emails = false } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      throw new ValidationError('Users array is required and cannot be empty');
    }

    if (users.length > 100) {
      throw new ValidationError('Maximum 100 users can be registered at once');
    }

    // Building admin can only register for their building
    if (req.user.role === USER_ROLES.BUILDING_ADMIN && req.user.building_id !== building_id) {
      throw new AuthenticationError('Can only register users for your building');
    }

    // Validate building and license availability
    const building = await Building.findById(building_id);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    const licenseUsingUsers = users.filter(u => [USER_ROLES.RESIDENT, USER_ROLES.BUILDING_ADMIN].includes(u.role));
    const requiredLicenses = licenseUsingUsers.length;
    const availableLicenses = building.total_licenses - building.used_licenses;

    if (requiredLicenses > availableLicenses) {
      throw new ConflictError(`Insufficient licenses. Required: ${requiredLicenses}, Available: ${availableLicenses}`);
    }

    const results = {
      successful: [],
      failed: [],
      total: users.length
    };

    // Process each user
    for (const userData of users) {
      try {
        // Validate required fields
        if (!userData.email || !userData.first_name || !userData.last_name) {
          throw new ValidationError('Email, first name, and last name are required');
        }

        // Check for duplicates
        const existingUser = await User.findByEmail(userData.email);
        if (existingUser) {
          throw new ConflictError('User with this email already exists');
        }

        // Create user
        const newUserData = {
          ...userData,
          password: userData.password || default_password || 'TempPass123!',
          building_id,
          role: userData.role || USER_ROLES.RESIDENT,
          uses_license: [USER_ROLES.RESIDENT, USER_ROLES.BUILDING_ADMIN].includes(userData.role || USER_ROLES.RESIDENT),
          is_active: true,
          is_verified: false,
          created_by: req.user.id,
          registration_method: 'bulk_import'
        };

        const user = await User.create(newUserData);

        // Update license count if needed
        if (newUserData.uses_license) {
          await Building.updateLicenseUsage(building_id, 1);
        }

        results.successful.push({
          email: userData.email,
          id: user.id,
          name: `${userData.first_name} ${userData.last_name}`
        });

        // TODO: Send welcome email if requested
        if (send_welcome_emails) {
          // await emailService.sendWelcomeEmail(user.email, newUserData.password);
        }

      } catch (error) {
        results.failed.push({
          email: userData.email,
          error: error.message,
          name: `${userData.first_name || ''} ${userData.last_name || ''}`
        });
      }
    }

    auth.info('Bulk user registration completed', {
      building_id,
      total: results.total,
      successful: results.successful.length,
      failed: results.failed.length,
      createdBy: req.user.id,
      ip: req.ip
    });

    res.status(201).json(createResponse(
      true,
      results,
      `Bulk registration completed. ${results.successful.length}/${results.total} users created successfully`
    ));
  });

  /**
   * Get registration statistics
   */
  getRegistrationStats = asyncHandler(async (req, res) => {
    const { building_id } = req.params;

    // Validate access
    if (req.user.role === USER_ROLES.BUILDING_ADMIN && req.user.building_id !== building_id) {
      throw new AuthenticationError('Can only view stats for your building');
    }

    const building = await Building.findById(building_id);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    // Get user counts by role
    const [residents, admins, security] = await Promise.all([
      User.findByRole(USER_ROLES.RESIDENT, building_id),
      User.findByRole(USER_ROLES.BUILDING_ADMIN, building_id),
      User.findByRole(USER_ROLES.SECURITY, building_id)
    ]);

    // Get registration trends (last 30 days)
    const registrationTrends = await User.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        role
      FROM users 
      WHERE building_id = $1 
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at), role
      ORDER BY date DESC
    `, [building_id]);

    // License utilization
    const licenseUtilization = await Building.getLicenseUtilization(building_id);

    res.json(createResponse(
      true,
      {
        building: {
          id: building.id,
          name: building.name
        },
        userCounts: {
          residents: residents.length,
          admins: admins.length,
          security: security.length,
          total: residents.length + admins.length + security.length
        },
        licenseUtilization,
        registrationTrends: registrationTrends.rows
      },
      'Registration statistics retrieved successfully'
    ));
  });
}

export default new UserRegistrationController();
