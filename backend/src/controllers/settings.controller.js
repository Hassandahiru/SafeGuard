import User from '../models/User.js';
import Building from '../models/Building.js';
import ApartmentChangeRequest from '../models/ApartmentChangeRequest.js';
import imageUploadService from '../services/imageUpload.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createResponse } from '../utils/helpers.js';
import { USER_ROLES } from '../utils/constants.js';
import { AuthorizationError, ValidationError, NotFoundError } from '../utils/errors/index.js';

class SettingsController {
  /**
   * Get user settings based on role
   */
  getSettings = asyncHandler(async (req, res) => {
    const { user } = req;
    
    let settings = {};
    
    switch (user.role) {
      case USER_ROLES.SUPER_ADMIN:
      case USER_ROLES.BUILDING_ADMIN:
        settings = await this.getAdminSettings(user);
        break;
      case USER_ROLES.RESIDENT:
        settings = await this.getResidentSettings(user);
        break;
      case USER_ROLES.SECURITY:
        settings = await this.getSecuritySettings(user);
        break;
      default:
        throw new AuthorizationError('Invalid user role for settings access');
    }

    res.json(createResponse(
      true,
      settings,
      'Settings retrieved successfully'
    ));
  });

  /**
   * Update user settings based on role
   */
  updateSettings = asyncHandler(async (req, res) => {
    const { user } = req;
    const updates = req.body;
    
    let updatedSettings = {};
    
    switch (user.role) {
      case USER_ROLES.SUPER_ADMIN:
      case USER_ROLES.BUILDING_ADMIN:
        updatedSettings = await this.updateAdminSettings(user, updates);
        break;
      case USER_ROLES.RESIDENT:
        updatedSettings = await this.updateResidentSettings(user, updates);
        break;
      case USER_ROLES.SECURITY:
        updatedSettings = await this.updateSecuritySettings(user, updates);
        break;
      default:
        throw new AuthorizationError('Invalid user role for settings update');
    }

    res.json(createResponse(
      true,
      updatedSettings,
      'Settings updated successfully'
    ));
  });

  /**
   * Get Admin settings
   */
  async getAdminSettings(user) {
    // Get building information
    const building = await Building.findById(user.building_id);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    // Get all building users for management
    const buildingUsers = await User.findByBuilding(user.building_id);
    const residents = buildingUsers.filter(u => u.role === USER_ROLES.RESIDENT);
    const security = buildingUsers.filter(u => u.role === USER_ROLES.SECURITY);
    const admins = buildingUsers.filter(u => u.role === USER_ROLES.BUILDING_ADMIN || u.role === USER_ROLES.SUPER_ADMIN);

    return {
      // Available settings capabilities
      capabilities: {
        canChangeProfileImage: true,
        canDeleteBuildingAccount: user.role === USER_ROLES.SUPER_ADMIN,
        canManageUsers: true,
        canRequestLicenses: true,
        canChangeBuildingLogo: true,
        canManageBuilding: true,
        canViewAnalytics: true,
        canManageSecuritySettings: true
      },
      
      // Personal settings
      profile: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        preferences: user.preferences || {},
        emergency_contact: user.emergency_contact
      },
      
      // Building settings
      building: {
        id: building.id,
        name: building.name,
        address: building.address,
        logo_url: building.logo_url,
        total_licenses: building.total_licenses,
        used_licenses: building.used_licenses,
        available_licenses: building.total_licenses - building.used_licenses,
        settings: building.settings || {},
        security_level: building.security_level,
        contact_info: building.contact_info || {}
      },
      
      // Users management data
      users: {
        total_residents: residents.length,
        total_security: security.length,
        total_admins: admins.length,
        residents: residents.map(r => ({
          id: r.id,
          name: `${r.first_name} ${r.last_name}`,
          email: r.email,
          apartment_number: r.apartment_number,
          is_active: r.is_active,
          last_login: r.last_login
        })),
        security: security.map(s => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          email: s.email,
          is_active: s.is_active,
          last_login: s.last_login
        })),
        admins: admins.map(a => ({
          id: a.id,
          name: `${a.first_name} ${a.last_name}`,
          email: a.email,
          role: a.role,
          is_active: a.is_active,
          last_login: a.last_login
        }))
      }
    };
  }

  /**
   * Get Resident settings
   */
  async getResidentSettings(user) {
    return {
      // Available settings capabilities
      capabilities: {
        canChangeProfileImage: true,
        canUpdatePersonalInfo: true,
        canChangePassword: true,
        canSetEmergencyContact: true,
        canManageNotifications: true,
        canViewVisitorHistory: true
      },
      
      // Personal settings
      profile: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        apartment_number: user.apartment_number,
        avatar_url: user.avatar_url,
        preferences: user.preferences || {},
        emergency_contact: user.emergency_contact
      },
      
      // Notification preferences
      notifications: {
        visitor_arrival: user.preferences?.notifications?.visitor_arrival ?? true,
        visitor_departure: user.preferences?.notifications?.visitor_departure ?? true,
        qr_code_generated: user.preferences?.notifications?.qr_code_generated ?? true,
        security_alerts: user.preferences?.notifications?.security_alerts ?? true,
        email_notifications: user.preferences?.notifications?.email_notifications ?? true,
        sms_notifications: user.preferences?.notifications?.sms_notifications ?? false
      }
    };
  }

  /**
   * Get Security settings
   */
  async getSecuritySettings(user) {
    return {
      // Available settings capabilities
      capabilities: {
        canChangeProfileImage: true,
        canUpdatePersonalInfo: true,
        canChangePassword: true,
        canSetEmergencyContact: true,
        canManageNotifications: true,
        canViewScanHistory: true
      },
      
      // Personal settings
      profile: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        preferences: user.preferences || {},
        emergency_contact: user.emergency_contact
      },
      
      // Security-specific preferences
      security_preferences: {
        scan_sound_enabled: user.preferences?.security?.scan_sound_enabled ?? true,
        auto_scan_mode: user.preferences?.security?.auto_scan_mode ?? false,
        alert_level: user.preferences?.security?.alert_level ?? 'medium',
        shift_notifications: user.preferences?.security?.shift_notifications ?? true
      }
    };
  }

  /**
   * Update Admin settings
   */
  async updateAdminSettings(user, updates) {
    const allowedUserUpdates = ['first_name', 'last_name', 'phone', 'avatar_url', 'emergency_contact'];
    const allowedBuildingUpdates = ['name', 'address', 'logo_url', 'contact_info', 'settings'];
    
    let updatedUser = user;
    let updatedBuilding = null;
    
    // Update user profile if provided
    if (updates.profile) {
      const userUpdates = {};
      allowedUserUpdates.forEach(field => {
        if (updates.profile[field] !== undefined) {
          userUpdates[field] = updates.profile[field];
        }
      });
      
      // Handle preferences separately
      if (updates.profile.preferences) {
        userUpdates.preferences = {
          ...user.preferences,
          ...updates.profile.preferences
        };
      }
      
      if (Object.keys(userUpdates).length > 0) {
        updatedUser = await User.update(user.id, userUpdates);
      }
    }
    
    // Update building if provided (only super admin or building admin)
    if (updates.building && user.role !== USER_ROLES.RESIDENT) {
      const buildingUpdates = {};
      allowedBuildingUpdates.forEach(field => {
        if (updates.building[field] !== undefined) {
          buildingUpdates[field] = updates.building[field];
        }
      });
      
      if (Object.keys(buildingUpdates).length > 0) {
        updatedBuilding = await Building.update(user.building_id, buildingUpdates);
      }
    }
    
    return {
      user: updatedUser,
      building: updatedBuilding,
      message: 'Admin settings updated successfully'
    };
  }

  /**
   * Update Resident settings
   */
  async updateResidentSettings(user, updates) {
    const allowedUpdates = ['first_name', 'last_name', 'phone', 'avatar_url', 'emergency_contact'];
    
    const userUpdates = {};
    let apartmentChangeRequest = null;
    
    // Handle regular profile updates
    allowedUpdates.forEach(field => {
      if (updates.profile && updates.profile[field] !== undefined) {
        userUpdates[field] = updates.profile[field];
      }
    });
    
    // Handle apartment number change separately - requires approval
    if (updates.profile && updates.profile.apartment_number !== undefined) {
      const requestedApartment = updates.profile.apartment_number;
      const changeReason = updates.profile.apartment_change_reason || 'Resident requested apartment number change';
      
      // Check if user already has a pending request
      const existingRequest = await ApartmentChangeRequest.getCurrentByUser(user.id);
      if (existingRequest) {
        throw new ValidationError('You already have a pending apartment change request. Please wait for admin approval or contact support.');
      }
      
      // Create apartment change request
      apartmentChangeRequest = await ApartmentChangeRequest.create(
        user.id,
        requestedApartment,
        changeReason
      );
    }
    
    // Handle preferences separately
    if (updates.profile && updates.profile.preferences) {
      userUpdates.preferences = {
        ...user.preferences,
        ...updates.profile.preferences
      };
    }
    
    // Handle notification preferences
    if (updates.notifications) {
      userUpdates.preferences = {
        ...user.preferences,
        notifications: {
          ...user.preferences?.notifications,
          ...updates.notifications
        }
      };
    }
    
    // Update user profile (excluding apartment number)
    let updatedUser = user;
    if (Object.keys(userUpdates).length > 0) {
      updatedUser = await User.update(user.id, userUpdates);
    }
    
    const response = {
      user: updatedUser,
      message: 'Resident settings updated successfully'
    };
    
    // Include apartment change request info if created
    if (apartmentChangeRequest) {
      response.apartment_change_request = {
        id: apartmentChangeRequest.request_id,
        requested_apartment: updates.profile.apartment_number,
        status: 'pending',
        expires_at: apartmentChangeRequest.expires_at,
        message: 'Apartment number change requires admin approval. Request has been submitted.'
      };
      response.message = 'Settings updated. Apartment number change request submitted for admin approval.';
    }
    
    return response;
  }

  /**
   * Update Security settings
   */
  async updateSecuritySettings(user, updates) {
    const allowedUpdates = ['first_name', 'last_name', 'phone', 'avatar_url', 'emergency_contact'];
    
    const userUpdates = {};
    allowedUpdates.forEach(field => {
      if (updates.profile && updates.profile[field] !== undefined) {
        userUpdates[field] = updates.profile[field];
      }
    });
    
    // Handle preferences separately
    if (updates.profile && updates.profile.preferences) {
      userUpdates.preferences = {
        ...user.preferences,
        ...updates.profile.preferences
      };
    }
    
    // Handle security-specific preferences
    if (updates.security_preferences) {
      userUpdates.preferences = {
        ...user.preferences,
        security: {
          ...user.preferences?.security,
          ...updates.security_preferences
        }
      };
    }
    
    let updatedUser = user;
    if (Object.keys(userUpdates).length > 0) {
      updatedUser = await User.update(user.id, userUpdates);
    }
    
    return {
      user: updatedUser,
      message: 'Security settings updated successfully'
    };
  }

  /**
   * Delete user (Admin only)
   */
  deleteUser = asyncHandler(async (req, res) => {
    const { user } = req;
    const { userId } = req.params;
    
    // Only admins can delete users
    if (user.role !== USER_ROLES.SUPER_ADMIN && user.role !== USER_ROLES.BUILDING_ADMIN) {
      throw new AuthorizationError('Only admins can delete users');
    }
    
    // Get the user to be deleted
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      throw new NotFoundError('User not found');
    }
    
    // Building admins can only delete users in their building
    if (user.role === USER_ROLES.BUILDING_ADMIN && userToDelete.building_id !== user.building_id) {
      throw new AuthorizationError('You can only delete users in your building');
    }
    
    // Cannot delete super admins (unless you are super admin)
    if (userToDelete.role === USER_ROLES.SUPER_ADMIN && user.role !== USER_ROLES.SUPER_ADMIN) {
      throw new AuthorizationError('Cannot delete super admin users');
    }
    
    // Soft delete the user
    await User.update(userId, { is_active: false, deleted_at: new Date() });
    
    res.json(createResponse(
      true,
      { deleted_user_id: userId },
      'User deleted successfully'
    ));
  });

  /**
   * Request additional licenses (Admin only)
   */
  requestLicenses = asyncHandler(async (req, res) => {
    const { user } = req;
    const { additional_licenses, reason } = req.body;
    
    // Only admins can request licenses
    if (user.role !== USER_ROLES.SUPER_ADMIN && user.role !== USER_ROLES.BUILDING_ADMIN) {
      throw new AuthorizationError('Only admins can request additional licenses');
    }
    
    if (!additional_licenses || additional_licenses <= 0) {
      throw new ValidationError('Additional licenses must be a positive number');
    }
    
    // Here you would typically create a license request record
    // For now, we'll just return a success response
    const licenseRequest = {
      building_id: user.building_id,
      requested_by: user.id,
      additional_licenses,
      reason: reason || 'License expansion request',
      status: 'pending',
      created_at: new Date()
    };
    
    res.json(createResponse(
      true,
      { license_request: licenseRequest },
      'License request submitted successfully'
    ));
  });

  /**
   * Delete building account (Super Admin only)
   */
  deleteBuildingAccount = asyncHandler(async (req, res) => {
    const { user } = req;
    
    // Only super admins can delete building accounts
    if (user.role !== USER_ROLES.SUPER_ADMIN) {
      throw new AuthorizationError('Only super admins can delete building accounts');
    }
    
    // Get building to be deleted
    const building = await Building.findById(user.building_id);
    if (!building) {
      throw new NotFoundError('Building not found');
    }
    
    // Soft delete the building and all associated users
    await Building.update(user.building_id, { is_active: false, deleted_at: new Date() });
    
    // Also deactivate all users in the building
    const buildingUsers = await User.findByBuilding(user.building_id);
    for (const buildingUser of buildingUsers) {
      await User.update(buildingUser.id, { is_active: false, deleted_at: new Date() });
    }
    
    res.json(createResponse(
      true,
      { deleted_building_id: user.building_id },
      'Building account deleted successfully'
    ));
  });

  /**
   * Upload profile picture
   */
  uploadProfilePicture = asyncHandler(async (req, res) => {
    const { user } = req;
    const file = req.file;
    
    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    try {
      // Get current user data to check for existing profile picture
      const currentUser = await User.findById(user.id);
      if (!currentUser) {
        throw new NotFoundError('User not found');
      }

      // Process the image using worker thread
      const processResult = await imageUploadService.processProfilePicture(file, user.id);
      
      if (!processResult.success) {
        throw new ValidationError('Failed to process profile picture');
      }

      // Delete old profile picture if exists
      if (currentUser.profile_picture) {
        await imageUploadService.deleteOldImage(currentUser.profile_picture);
      }

      // Update user record with new profile picture
      const updatedUser = await User.update(user.id, {
        profile_picture: processResult.data.filePath,
        profile_picture_uploaded_at: new Date()
      });

      res.json(createResponse(
        true,
        {
          user: {
            id: updatedUser.id,
            profile_picture: processResult.data.filePath,
            profile_picture_uploaded_at: updatedUser.profile_picture_uploaded_at
          },
          upload_info: {
            original_name: processResult.data.originalName,
            file_size: processResult.data.size,
            processed_at: processResult.data.processedAt
          }
        },
        'Profile picture uploaded successfully'
      ));

    } catch (error) {
      // Clean up file if processing failed
      if (file) {
        try {
          await imageUploadService.deleteOldImage(file.path);
        } catch (cleanupError) {
          // Log but don't throw cleanup errors
          console.error('Failed to cleanup file after error:', cleanupError);
        }
      }
      throw error;
    }
  });

  /**
   * Upload building logo (Admin only)
   */
  uploadBuildingLogo = asyncHandler(async (req, res) => {
    const { user } = req;
    const file = req.file;
    
    // Check admin permissions
    const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN];
    if (!adminRoles.includes(user.role)) {
      throw new AuthorizationError('Only building administrators can upload building logos');
    }

    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    try {
      // Get current building data to check for existing logo
      const currentBuilding = await Building.findById(user.building_id);
      if (!currentBuilding) {
        throw new NotFoundError('Building not found');
      }

      // Process the image using worker thread
      const processResult = await imageUploadService.processBuildingLogo(file, user.building_id);
      
      if (!processResult.success) {
        throw new ValidationError('Failed to process building logo');
      }

      // Delete old building logo if exists
      if (currentBuilding.building_logo) {
        await imageUploadService.deleteOldImage(currentBuilding.building_logo);
      }

      // Update building record with new logo
      const updatedBuilding = await Building.update(user.building_id, {
        building_logo: processResult.data.filePath,
        building_logo_uploaded_at: new Date()
      });

      res.json(createResponse(
        true,
        {
          building: {
            id: updatedBuilding.id,
            building_logo: processResult.data.filePath,
            building_logo_uploaded_at: updatedBuilding.building_logo_uploaded_at
          },
          upload_info: {
            original_name: processResult.data.originalName,
            file_size: processResult.data.size,
            processed_at: processResult.data.processedAt
          }
        },
        'Building logo uploaded successfully'
      ));

    } catch (error) {
      // Clean up file if processing failed
      if (file) {
        try {
          await imageUploadService.deleteOldImage(file.path);
        } catch (cleanupError) {
          // Log but don't throw cleanup errors
          console.error('Failed to cleanup file after error:', cleanupError);
        }
      }
      throw error;
    }
  });

  /**
   * Delete profile picture
   */
  deleteProfilePicture = asyncHandler(async (req, res) => {
    const { user } = req;
    
    // Get current user data
    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      throw new NotFoundError('User not found');
    }

    if (!currentUser.profile_picture) {
      throw new ValidationError('No profile picture to delete');
    }

    try {
      // Delete the image file
      await imageUploadService.deleteOldImage(currentUser.profile_picture);

      // Update user record to remove profile picture
      const updatedUser = await User.update(user.id, {
        profile_picture: null,
        profile_picture_uploaded_at: null
      });

      res.json(createResponse(
        true,
        {
          user: {
            id: updatedUser.id,
            profile_picture: null,
            profile_picture_uploaded_at: null
          }
        },
        'Profile picture deleted successfully'
      ));

    } catch (error) {
      throw error;
    }
  });

  /**
   * Delete building logo (Admin only)
   */
  deleteBuildingLogo = asyncHandler(async (req, res) => {
    const { user } = req;
    
    // Check admin permissions
    const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN];
    if (!adminRoles.includes(user.role)) {
      throw new AuthorizationError('Only building administrators can delete building logos');
    }

    // Get current building data
    const currentBuilding = await Building.findById(user.building_id);
    if (!currentBuilding) {
      throw new NotFoundError('Building not found');
    }

    if (!currentBuilding.building_logo) {
      throw new ValidationError('No building logo to delete');
    }

    try {
      // Delete the image file
      await imageUploadService.deleteOldImage(currentBuilding.building_logo);

      // Update building record to remove logo
      const updatedBuilding = await Building.update(user.building_id, {
        building_logo: null,
        building_logo_uploaded_at: null
      });

      res.json(createResponse(
        true,
        {
          building: {
            id: updatedBuilding.id,
            building_logo: null,
            building_logo_uploaded_at: null
          }
        },
        'Building logo deleted successfully'
      ));

    } catch (error) {
      throw error;
    }
  });

  /**
   * Get image upload service health status
   */
  getImageServiceHealth = asyncHandler(async (req, res) => {
    const healthStatus = imageUploadService.getHealthStatus();
    
    res.json(createResponse(
      true,
      healthStatus,
      'Image service health status retrieved'
    ));
  });

  // ============= APARTMENT CHANGE APPROVAL ENDPOINTS =============

  /**
   * Get pending apartment change requests (Admin only)
   */
  getPendingApartmentChanges = asyncHandler(async (req, res) => {
    const { user } = req;
    const { limit = 20, offset = 0 } = req.query;
    
    if (!['building_admin', 'super_admin'].includes(user.role)) {
      throw new AuthorizationError('Only building administrators can view apartment change requests');
    }
    
    const result = await ApartmentChangeRequest.getPendingByBuilding(
      user.building_id,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json(createResponse(
      true,
      result,
      'Pending apartment change requests retrieved successfully'
    ));
  });

  /**
   * Process apartment change approval (Admin only)
   */
  processApartmentChangeApproval = asyncHandler(async (req, res) => {
    const { user } = req;
    const { requestId } = req.params;
    const { approved, reason } = req.body;
    
    if (!['building_admin', 'super_admin'].includes(user.role)) {
      throw new AuthorizationError('Only building administrators can approve apartment changes');
    }
    
    if (typeof approved !== 'boolean') {
      throw new ValidationError('Approved field must be true or false');
    }
    
    const result = await ApartmentChangeRequest.processApproval(
      requestId,
      user.id,
      approved,
      reason
    );
    
    res.json(createResponse(
      true,
      result,
      approved ? 'Apartment change approved successfully' : 'Apartment change rejected'
    ));
  });

  /**
   * Get apartment change request details (Admin only)
   */
  getApartmentChangeRequest = asyncHandler(async (req, res) => {
    const { user } = req;
    const { requestId } = req.params;
    
    if (!['building_admin', 'super_admin'].includes(user.role)) {
      throw new AuthorizationError('Only building administrators can view apartment change requests');
    }
    
    const request = await ApartmentChangeRequest.findById(requestId);
    
    // Verify request belongs to admin's building
    if (user.role !== USER_ROLES.SUPER_ADMIN && request.building_id !== user.building_id) {
      throw new AuthorizationError('Access denied to this apartment change request');
    }
    
    res.json(createResponse(
      true,
      { request },
      'Apartment change request details retrieved successfully'
    ));
  });

  /**
   * Get apartment change dashboard (Admin only)
   */
  getApartmentChangeDashboard = asyncHandler(async (req, res) => {
    const { user } = req;
    
    if (!['building_admin', 'super_admin'].includes(user.role)) {
      throw new AuthorizationError('Only building administrators can view apartment change dashboard');
    }
    
    const [pendingRequests, stats] = await Promise.all([
      ApartmentChangeRequest.getPendingByBuilding(user.building_id, 5, 0),
      ApartmentChangeRequest.getDashboardStats(user.building_id)
    ]);
    
    res.json(createResponse(
      true,
      {
        statistics: stats,
        recent_requests: pendingRequests.requests,
        pending_count: pendingRequests.statistics.pending_count
      },
      'Apartment change dashboard retrieved successfully'
    ));
  });

  /**
   * Get user's apartment change history
   */
  getUserApartmentChangeHistory = asyncHandler(async (req, res) => {
    const { user } = req;
    const { limit = 10 } = req.query;
    
    const history = await ApartmentChangeRequest.getHistoryByUser(user.id, parseInt(limit));
    
    res.json(createResponse(
      true,
      { history },
      'Apartment change history retrieved successfully'
    ));
  });

  /**
   * Get current apartment change request for user
   */
  getCurrentApartmentChangeRequest = asyncHandler(async (req, res) => {
    const { user } = req;
    
    const currentRequest = await ApartmentChangeRequest.getCurrentByUser(user.id);
    
    res.json(createResponse(
      true,
      { current_request: currentRequest },
      currentRequest ? 'Current apartment change request found' : 'No pending apartment change request'
    ));
  });
}

export default SettingsController;