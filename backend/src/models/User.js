import BaseModel from './BaseModel.js';
import { hashPassword, comparePassword } from '../utils/helpers.js';
import { USER_ROLES } from '../utils/constants.js';
import { DatabaseError, NotFoundError, ConflictError } from '../utils/errors/index.js';

class User extends BaseModel {
  constructor() {
    super('users');
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async create(userData) {
    // Hash password before saving
    if (userData.password) {
      userData.password_hash = await hashPassword(userData.password);
      delete userData.password;
    }

    // Check if email already exists
    const existingUser = await this.findOne({ email: userData.email });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Check if phone already exists
    if (userData.phone) {
      const existingPhone = await this.findOne({ phone: userData.phone });
      if (existingPhone) {
        throw new ConflictError('User with this phone number already exists');
      }
    }

    return await super.create(userData);
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} Found user or null
   */
  async findByEmail(email) {
    return await this.findOne({ email, is_active: true });
  }

  /**
   * Find user by phone
   * @param {string} phone - User phone
   * @returns {Promise<Object|null>} Found user or null
   */
  async findByPhone(phone) {
    return await this.findOne({ phone, is_active: true });
  }

  /**
   * Authenticate user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Authenticated user
   */
  async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new DatabaseError('Invalid password');
    }

    // Update last login
    await this.update(user.id, { last_login: new Date() });

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Updated user
   */
  async updatePassword(userId, newPassword) {
    const passwordHash = await hashPassword(newPassword);
    return await this.update(userId, { password_hash: passwordHash });
  }

  /**
   * Get users by building
   * @param {string} buildingId - Building ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Building users
   */
  async findByBuilding(buildingId, options = {}) {
    return await this.findAll({ building_id: buildingId, is_active: true }, options);
  }

  /**
   * Get users by role
   * @param {string} role - User role
   * @param {string} buildingId - Building ID (optional)
   * @returns {Promise<Array>} Users with specified role
   */
  async findByRole(role, buildingId = null) {
    const conditions = { role, is_active: true };
    if (buildingId) {
      conditions.building_id = buildingId;
    }
    return await this.findAll(conditions);
  }

  /**
   * Get building administrators
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Building administrators
   */
  async getBuildingAdmins(buildingId) {
    return await this.findByRole(USER_ROLES.BUILDING_ADMIN, buildingId);
  }

  /**
   * Get building residents
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Building residents
   */
  async getBuildingResidents(buildingId) {
    return await this.findByRole(USER_ROLES.RESIDENT, buildingId);
  }

  /**
   * Get building security personnel
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Security personnel
   */
  async getBuildingSecurity(buildingId) {
    return await this.findByRole(USER_ROLES.SECURITY, buildingId);
  }

  /**
   * Check if user has permission for action
   * @param {string} userId - User ID
   * @param {string} permission - Required permission
   * @param {string} resourceId - Resource ID (optional)
   * @returns {Promise<boolean>} Permission check result
   */
  async hasPermission(userId, permission, resourceId = null) {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    // Super admin has all permissions
    if (user.role === USER_ROLES.SUPER_ADMIN) {
      return true;
    }

    // Building admin has permissions within their building
    if (user.role === USER_ROLES.BUILDING_ADMIN) {
      if (resourceId) {
        // Check if resource belongs to user's building
        // This would need to be implemented based on resource type
        return true;
      }
      return true;
    }

    // Resident has limited permissions
    if (user.role === USER_ROLES.RESIDENT) {
      return ['create_visit', 'manage_visitors', 'view_own_data'].includes(permission);
    }

    // Security has gate-related permissions
    if (user.role === USER_ROLES.SECURITY) {
      return ['scan_qr', 'log_visitor_actions', 'view_active_visits'].includes(permission);
    }

    return false;
  }

  /**
   * Increment failed login attempts
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async incrementLoginAttempts(userId) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newAttempts = (user.login_attempts || 0) + 1;
    const updateData = { login_attempts: newAttempts };

    // Lock account after 5 failed attempts
    if (newAttempts >= 5) {
      updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    return await this.update(userId, updateData);
  }

  /**
   * Reset failed login attempts
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async resetLoginAttempts(userId) {
    return await this.update(userId, {
      login_attempts: 0,
      locked_until: null
    });
  }

  /**
   * Check if user account is locked
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Lock status
   */
  async isAccountLocked(userId) {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      return true;
    }

    // Auto-unlock if lock period has passed
    if (user.locked_until && new Date() >= new Date(user.locked_until)) {
      await this.resetLoginAttempts(userId);
    }

    return false;
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userId) {
    const query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.role,
        u.apartment_number,
        u.last_login,
        u.created_at,
        COUNT(DISTINCT v.id) as total_visits_hosted,
        COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as visits_last_30_days,
        COUNT(DISTINCT vis.id) as total_unique_visitors,
        COUNT(DISTINCT fv.id) as frequent_visitors_count,
        COUNT(DISTINCT n.id) FILTER (WHERE n.is_read = false) as unread_notifications
      FROM users u
      LEFT JOIN visits v ON u.id = v.host_id
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      LEFT JOIN visitors vis ON vv.visitor_id = vis.id
      LEFT JOIN frequent_visitors fv ON u.id = fv.user_id AND fv.is_active = true
      LEFT JOIN notifications n ON u.id = n.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.first_name, u.last_name, u.role, u.apartment_number, u.last_login, u.created_at
    `;

    const result = await this.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Search users
   * @param {string} searchTerm - Search term
   * @param {string} buildingId - Building ID (optional)
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async search(searchTerm, buildingId = null, options = {}) {
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE is_active = true
      AND (
        first_name ILIKE $1 OR 
        last_name ILIKE $1 OR 
        email ILIKE $1 OR 
        phone ILIKE $1 OR
        apartment_number ILIKE $1
      )
    `;

    const params = [`%${searchTerm}%`];
    let paramCount = 2;

    if (buildingId) {
      query += ` AND building_id = $${paramCount}`;
      params.push(buildingId);
      paramCount++;
    }

    query += ` ORDER BY first_name, last_name`;

    if (options.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Get online users
   * @param {string} buildingId - Building ID
   * @param {number} minutesThreshold - Minutes threshold for online status
   * @returns {Promise<Array>} Online users
   */
  async getOnlineUsers(buildingId, minutesThreshold = 5) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE building_id = $1
      AND is_active = true
      AND last_login >= NOW() - INTERVAL '${minutesThreshold} minutes'
      ORDER BY last_login DESC
    `;

    const result = await this.query(query, [buildingId]);
    return result.rows;
  }

  /**
   * Deactivate user account
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async deactivateAccount(userId) {
    return await this.update(userId, {
      is_active: false,
      locked_until: null,
      login_attempts: 0
    });
  }

  /**
   * Activate user account
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async activateAccount(userId) {
    return await this.update(userId, {
      is_active: true,
      locked_until: null,
      login_attempts: 0
    });
  }
}

export default new User();