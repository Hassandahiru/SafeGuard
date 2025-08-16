import User from '../models/User.js';
import Building from '../models/Building.js';
import License from '../models/License.js';
import { USER_ROLES, LICENSE_STATUS, HTTP_STATUS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { hashPassword } from '../utils/helpers.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  AuthorizationError 
} from '../utils/errors/index.js';

/**
 * Admin controller for managing buildings, users, and licenses
 */
class AdminController {
  /**
   * Create a new building admin
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createBuildingAdmin(req, res) {
    try {
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        phone, 
        buildingId,
        apartmentNumber 
      } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !phone || !buildingId) {
        throw new ValidationError('All required fields must be provided');
      }

      // Check if user has permission to create admin
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        // Building admins can only create admins for their own building
        if (req.user.role === USER_ROLES.BUILDING_ADMIN && req.user.building_id !== buildingId) {
          throw new AuthorizationError('You can only create admins for your own building');
        }
      }

      // Check if building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        throw new NotFoundError('Building not found');
      }

      // Check license availability
      const hasLicense = await Building.hasAvailableLicenses(buildingId);
      if (!hasLicense) {
        throw new ConflictError('No available licenses for this building');
      }

      // Create building admin
      const adminData = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone,
        building_id: buildingId,
        apartment_number: apartmentNumber,
        role: USER_ROLES.BUILDING_ADMIN,
        is_active: true,
        is_verified: true,
        uses_license: true
      };

      const admin = await User.create(adminData);

      // Update building license usage
      await Building.updateLicenseUsage(buildingId, 1);

      // Remove password from response
      const { password_hash, ...adminResponse } = admin;

      logger.info('Building admin created successfully', {
        adminId: admin.id,
        buildingId,
        createdBy: req.user.id
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Building admin created successfully',
        data: adminResponse
      });
    } catch (error) {
      logger.error('Error creating building admin:', error);
      throw error;
    }
  }

  /**
   * Register a new building
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async registerBuilding(req, res) {
    try {
      const {
        name,
        address,
        city,
        state,
        country = 'Nigeria',
        postalCode,
        phone,
        email,
        website,
        totalLicenses = 250,
        securityLevel = 1,
        adminEmail,
        adminPassword,
        adminFirstName,
        adminLastName,
        adminPhone,
        adminApartment,
        licenseData
      } = req.body;

      // Validate required fields
      if (!name || !address || !city || !state || !adminEmail || !adminPassword || !adminFirstName || !adminLastName || !adminPhone) {
        throw new ValidationError('All required fields must be provided');
      }

      // Only super admins can register buildings
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        throw new AuthorizationError('Only super admins can register buildings');
      }

      // Create building
      const buildingData = {
        name,
        address,
        city,
        state,
        country,
        postal_code: postalCode,
        phone,
        email,
        website,
        total_licenses: totalLicenses,
        used_licenses: 1, // Admin will use 1 license
        security_level: securityLevel,
        is_active: true,
        settings: {}
      };

      const building = await Building.create(buildingData);

      // Create license for the building
      const licenseInfo = {
        building_id: building.id,
        plan_type: licenseData?.planType || 'standard',
        total_licenses: totalLicenses,
        starts_at: new Date(),
        expires_at: new Date(Date.now() + (licenseData?.durationMonths || 12) * 30 * 24 * 60 * 60 * 1000),
        amount: licenseData?.amount || 0,
        currency: licenseData?.currency || 'NGN',
        payment_reference: licenseData?.paymentReference || null,
        features: licenseData?.features || {}
      };

      const license = await License.create(licenseInfo);

      // Create building admin
      const adminData = {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        phone: adminPhone,
        apartment_number: adminApartment,
        building_id: building.id,
        role: USER_ROLES.BUILDING_ADMIN,
        is_active: true,
        is_verified: true,
        uses_license: true
      };

      const admin = await User.create(adminData);

      // Remove password from response
      const { password_hash, ...adminResponse } = admin;

      logger.info('Building registered successfully', {
        buildingId: building.id,
        licenseId: license.id,
        adminId: admin.id,
        createdBy: req.user.id
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Building registered successfully',
        data: {
          building,
          license,
          admin: adminResponse
        }
      });
    } catch (error) {
      logger.error('Error registering building:', error);
      throw error;
    }
  }

  /**
   * Allocate license to building
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async allocateLicense(req, res) {
    try {
      const { buildingId } = req.params;
      const {
        planType = 'standard',
        totalLicenses = 250,
        durationMonths = 12,
        amount = 0,
        currency = 'NGN',
        paymentReference,
        features = {}
      } = req.body;

      // Only super admins can allocate licenses
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        throw new AuthorizationError('Only super admins can allocate licenses');
      }

      // Check if building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        throw new NotFoundError('Building not found');
      }

      // Check if building already has an active license
      const existingLicense = await License.findActiveByBuilding(buildingId);
      if (existingLicense) {
        throw new ConflictError('Building already has an active license');
      }

      // Create license
      const licenseData = {
        building_id: buildingId,
        plan_type: planType,
        total_licenses: totalLicenses,
        starts_at: new Date(),
        expires_at: new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000),
        amount,
        currency,
        payment_reference: paymentReference,
        features
      };

      const license = await License.create(licenseData);

      // Update building license configuration
      await Building.update(buildingId, {
        total_licenses: totalLicenses
      });

      logger.info('License allocated successfully', {
        licenseId: license.id,
        buildingId,
        allocatedBy: req.user.id
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'License allocated successfully',
        data: license
      });
    } catch (error) {
      logger.error('Error allocating license:', error);
      throw error;
    }
  }

  /**
   * Get all buildings with statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllBuildings(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        city = '', 
        state = '',
        status = 'all' 
      } = req.query;

      // Only super admins can view all buildings
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        throw new AuthorizationError('Only super admins can view all buildings');
      }

      let query = `
        SELECT 
          b.*,
          COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'resident' AND u.is_active = true) as total_residents,
          COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'building_admin' AND u.is_active = true) as total_admins,
          COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'security' AND u.is_active = true) as total_security,
          COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as visits_last_30_days,
          COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_licenses,
          ROUND((b.used_licenses::DECIMAL / b.total_licenses * 100), 2) as license_usage_percentage,
          CASE 
            WHEN EXISTS(SELECT 1 FROM licenses WHERE building_id = b.id AND status = 'active' AND expires_at > CURRENT_TIMESTAMP) THEN 'LICENSED'
            ELSE 'UNLICENSED'
          END as license_status
        FROM buildings b
        LEFT JOIN users u ON b.id = u.building_id
        LEFT JOIN visits v ON b.id = v.building_id
        LEFT JOIN licenses l ON b.id = l.building_id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      // Add search filter
      if (search) {
        query += ` AND (b.name ILIKE $${paramCount} OR b.address ILIKE $${paramCount} OR b.city ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      // Add city filter
      if (city) {
        query += ` AND b.city = $${paramCount}`;
        params.push(city);
        paramCount++;
      }

      // Add state filter
      if (state) {
        query += ` AND b.state = $${paramCount}`;
        params.push(state);
        paramCount++;
      }

      // Add status filter
      if (status !== 'all') {
        query += ` AND b.is_active = $${paramCount}`;
        params.push(status === 'active');
        paramCount++;
      }

      query += ` GROUP BY b.id ORDER BY b.created_at DESC`;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await Building.query(query, params);
      const buildings = result.rows;

      // Get total count
      let countQuery = `
        SELECT COUNT(DISTINCT b.id) as total
        FROM buildings b
        WHERE 1=1
      `;

      const countParams = [];
      let countParamCount = 1;

      if (search) {
        countQuery += ` AND (b.name ILIKE $${countParamCount} OR b.address ILIKE $${countParamCount} OR b.city ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
        countParamCount++;
      }

      if (city) {
        countQuery += ` AND b.city = $${countParamCount}`;
        countParams.push(city);
        countParamCount++;
      }

      if (state) {
        countQuery += ` AND b.state = $${countParamCount}`;
        countParams.push(state);
        countParamCount++;
      }

      if (status !== 'all') {
        countQuery += ` AND b.is_active = $${countParamCount}`;
        countParams.push(status === 'active');
      }

      const countResult = await Building.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].total);

      const totalPages = Math.ceil(totalCount / limit);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          buildings,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching buildings:', error);
      throw error;
    }
  }

  /**
   * Get building details with comprehensive statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBuildingDetails(req, res) {
    try {
      const { buildingId } = req.params;

      // Check authorization
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        if (req.user.role !== USER_ROLES.BUILDING_ADMIN || req.user.building_id !== buildingId) {
          throw new AuthorizationError('You can only view details of your own building');
        }
      }

      // Get building with statistics
      const building = await Building.findWithStats(buildingId);
      if (!building) {
        throw new NotFoundError('Building not found');
      }

      // Get active license
      const license = await License.findActiveByBuilding(buildingId);

      // Get license history
      const licenseHistory = await License.getLicenseHistory(buildingId);

      // Get building admins
      const admins = await User.getBuildingAdmins(buildingId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          building,
          license,
          licenseHistory,
          admins
        }
      });
    } catch (error) {
      logger.error('Error fetching building details:', error);
      throw error;
    }
  }

  /**
   * Get all licenses with statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllLicenses(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status = null, 
        buildingId = null,
        expiringOnly = false 
      } = req.query;

      // Only super admins can view all licenses
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        throw new AuthorizationError('Only super admins can view all licenses');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        buildingId,
        expiringOnly: expiringOnly === 'true'
      };

      const licenses = await License.getAllWithStats(options);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          licenses,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            hasNext: licenses.length === parseInt(limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching licenses:', error);
      throw error;
    }
  }

  /**
   * Get license statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLicenseStats(req, res) {
    try {
      const { licenseId } = req.params;

      // Only super admins can view license stats
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        throw new AuthorizationError('Only super admins can view license statistics');
      }

      const stats = await License.getLicenseStats(licenseId);
      if (!stats) {
        throw new NotFoundError('License not found');
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching license stats:', error);
      throw error;
    }
  }

  /**
   * Extend license expiry
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async extendLicense(req, res) {
    try {
      const { licenseId } = req.params;
      const { months } = req.body;

      // Only super admins can extend licenses
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        throw new AuthorizationError('Only super admins can extend licenses');
      }

      if (!months || months <= 0) {
        throw new ValidationError('Valid number of months is required');
      }

      const license = await License.extendLicense(licenseId, months);

      logger.info('License extended successfully', {
        licenseId,
        months,
        extendedBy: req.user.id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'License extended successfully',
        data: license
      });
    } catch (error) {
      logger.error('Error extending license:', error);
      throw error;
    }
  }

  /**
   * Suspend license
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async suspendLicense(req, res) {
    try {
      const { licenseId } = req.params;
      const { reason } = req.body;

      // Only super admins can suspend licenses
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        throw new AuthorizationError('Only super admins can suspend licenses');
      }

      if (!reason) {
        throw new ValidationError('Suspension reason is required');
      }

      const license = await License.suspendLicense(licenseId, reason);

      logger.info('License suspended successfully', {
        licenseId,
        reason,
        suspendedBy: req.user.id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'License suspended successfully',
        data: license
      });
    } catch (error) {
      logger.error('Error suspending license:', error);
      throw error;
    }
  }

  /**
   * Activate license
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async activateLicense(req, res) {
    try {
      const { licenseId } = req.params;

      // Only super admins can activate licenses
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        throw new AuthorizationError('Only super admins can activate licenses');
      }

      const license = await License.activateLicense(licenseId);

      logger.info('License activated successfully', {
        licenseId,
        activatedBy: req.user.id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'License activated successfully',
        data: license
      });
    } catch (error) {
      logger.error('Error activating license:', error);
      throw error;
    }
  }

  /**
   * Initial system setup - creates first super admin and building
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async initialSetup(req, res) {
    try {
      const {
        // Building details
        name,
        address,
        city,
        state,
        country = 'Nigeria',
        postalCode,
        buildingPhone,
        buildingEmail,
        website,
        totalLicenses = 250,
        securityLevel = 1,
        // Super admin details
        adminEmail,
        adminPassword,
        adminFirstName,
        adminLastName,
        adminPhone,
        adminApartment,
        // License details
        licenseData
      } = req.body;

      // Validate required fields
      if (!name || !address || !city || !state || !adminEmail || !adminPassword || !adminFirstName || !adminLastName || !adminPhone) {
        throw new ValidationError('All required fields must be provided');
      }

      // Check if any super admin already exists (security check)
      const existingSuperAdmin = await User.findByRole(USER_ROLES.SUPER_ADMIN);
      if (existingSuperAdmin && existingSuperAdmin.length > 0) {
        throw new ConflictError('System already initialized. Super admin exists.');
      }

      // Create building
      const buildingData = {
        name,
        address,
        city,
        state,
        country,
        postal_code: postalCode,
        phone: buildingPhone,
        email: buildingEmail,
        website,
        total_licenses: totalLicenses,
        used_licenses: 1, // Super admin will use 1 license
        security_level: securityLevel,
        is_active: true,
        settings: {}
      };

      const building = await Building.create(buildingData);

      // Create license for the building
      const licenseInfo = {
        building_id: building.id,
        plan_type: licenseData?.planType || 'enterprise',
        total_licenses: totalLicenses,
        starts_at: new Date(),
        expires_at: new Date(Date.now() + (licenseData?.durationMonths || 12) * 30 * 24 * 60 * 60 * 1000),
        amount: licenseData?.amount || 0,
        currency: licenseData?.currency || 'NGN',
        payment_reference: licenseData?.paymentReference || 'SETUP',
        features: licenseData?.features || {
          qr_codes: true,
          analytics: true,
          emergency_alerts: true,
          visitor_management: true,
          admin_dashboard: true
        }
      };

      const license = await License.create(licenseInfo);

      // Create super admin
      const superAdminData = {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        phone: adminPhone,
        apartment_number: adminApartment,
        building_id: building.id,
        role: USER_ROLES.SUPER_ADMIN,
        is_active: true,
        is_verified: true,
        uses_license: true
      };

      const superAdmin = await User.create(superAdminData);

      // Remove password from response
      const { password_hash, ...adminResponse } = superAdmin;

      logger.info('Initial system setup completed', {
        buildingId: building.id,
        licenseId: license.id,
        superAdminId: superAdmin.id,
        setupBy: 'system_initialization'
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'System initialized successfully',
        data: {
          building,
          license,
          superAdmin: adminResponse
        }
      });
    } catch (error) {
      logger.error('Error during initial setup:', error);
      throw error;
    }
  }

  /**
   * Self-service building registration for new customers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async selfServiceBuildingRegistration(req, res) {
    try {
      const {
        // Building details
        name,
        address,
        city,
        state,
        country = 'Nigeria',
        postalCode,
        buildingPhone,
        buildingEmail,
        website,
        totalLicenses = 100,
        // Building admin details
        adminEmail,
        adminPassword,
        adminFirstName,
        adminLastName,
        adminPhone,
        adminApartment,
        // Optional company details
        companyName,
        contactEmail,
        contactPhone
      } = req.body;

      // Validate required fields
      if (!name || !address || !city || !state || !adminEmail || !adminPassword || !adminFirstName || !adminLastName || !adminPhone) {
        throw new ValidationError('All required fields must be provided');
      }

      // Check if admin email already exists
      const existingUser = await User.findByEmail(adminEmail);
      if (existingUser) {
        throw new ConflictError('Email already registered. Please use a different email address.');
      }

      // Check if building email already exists (optional uniqueness check)
      if (buildingEmail) {
        const existingBuildingEmail = await Building.findByEmail(buildingEmail);
        if (existingBuildingEmail) {
          throw new ConflictError('Building email already registered. Please use a different email address.');
        }
      }

      // Create building
      const buildingData = {
        name,
        address,
        city,
        state,
        country,
        postal_code: postalCode,
        phone: buildingPhone,
        email: buildingEmail || adminEmail,
        website,
        total_licenses: totalLicenses,
        used_licenses: 1, // Building admin will use 1 license
        security_level: 1, // Start with basic security level
        is_active: true,
        settings: {
          company_name: companyName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          registration_type: 'self_service',
          registration_date: new Date().toISOString()
        }
      };

      const building = await Building.create(buildingData);

      // Create trial license for the building (30-day trial)
      const licenseInfo = {
        building_id: building.id,
        plan_type: 'standard',
        total_licenses: totalLicenses,
        starts_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        amount: 0, // Free trial
        currency: 'NGN',
        payment_reference: 'TRIAL_REGISTRATION',
        features: {
          qr_codes: true,
          visitor_management: true,
          basic_analytics: true,
          email_notifications: true,
          mobile_app: true,
          // Limit trial features
          emergency_alerts: false,
          advanced_analytics: false,
          api_access: false,
          custom_branding: false
        }
      };

      const license = await License.create(licenseInfo);

      // Create building admin
      const buildingAdminData = {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        phone: adminPhone,
        apartment_number: adminApartment || 'ADMIN-001',
        building_id: building.id,
        role: USER_ROLES.BUILDING_ADMIN,
        is_active: true,
        is_verified: true, // Auto-verify for self-service registration
        uses_license: true,
        registration_source: 'self_service'
      };

      const buildingAdmin = await User.create(buildingAdminData);

      // Remove password from response
      const { password_hash, ...adminResponse } = buildingAdmin;

      logger.info('Self-service building registration completed', {
        buildingId: building.id,
        licenseId: license.id,
        buildingAdminId: buildingAdmin.id,
        registrationType: 'self_service',
        companyName: companyName
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Building registered successfully! Welcome to SafeGuard.',
        data: {
          building,
          license,
          admin: adminResponse,
          trial_info: {
            trial_period_days: 30,
            expires_at: license.expires_at,
            features_included: Object.keys(licenseInfo.features).filter(key => licenseInfo.features[key]),
            next_steps: [
              'Complete your building profile',
              'Add residents and security staff',
              'Configure visitor management settings',
              'Explore premium features before trial expires'
            ]
          }
        }
      });
    } catch (error) {
      logger.error('Error during self-service building registration:', error);
      throw error;
    }
  }

  /**
   * Get system dashboard statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDashboardStats(req, res) {
    try {
      // Only super admins can view dashboard stats
      if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
        throw new AuthorizationError('Only super admins can view dashboard statistics');
      }

      // Get overall building stats
      const buildingStats = await Building.getOverallStats();

      // Get expiring licenses
      const expiringLicenses = await License.getExpiringLicenses(30);

      // Get high usage buildings
      const highUsageBuildings = await Building.getHighUsageBuildings(90);

      // Get recent licenses
      const recentLicenses = await License.getAllWithStats({ limit: 10 });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          buildingStats,
          expiringLicenses,
          highUsageBuildings,
          recentLicenses
        }
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }
}

export default new AdminController();