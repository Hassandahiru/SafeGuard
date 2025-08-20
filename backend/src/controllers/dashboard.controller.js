import User from '../models/User.js';
import Visit from '../models/Visit.js';
import VisitorBan from '../models/VisitorBan.js';
import FrequentVisitor from '../models/FrequentVisitor.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createResponse } from '../utils/helpers.js';
import { USER_ROLES } from '../utils/constants.js';
import { AuthorizationError } from '../utils/errors/index.js';

class DashboardController {
  /**
   * Get dashboard data based on user role
   */
  getDashboard = asyncHandler(async (req, res) => {
    const { user } = req;
    
    let dashboardData = {};
    
    switch (user.role) {
      case USER_ROLES.SUPER_ADMIN:
      case USER_ROLES.BUILDING_ADMIN:
        dashboardData = await this.getAdminDashboard(user);
        break;
      case USER_ROLES.RESIDENT:
        dashboardData = await this.getResidentDashboard(user);
        break;
      case USER_ROLES.SECURITY:
        dashboardData = await this.getSecurityDashboard(user);
        break;
      default:
        throw new AuthorizationError('Invalid user role for dashboard access');
    }

    res.json(createResponse(
      true,
      dashboardData,
      'Dashboard data retrieved successfully'
    ));
  });

  /**
   * Get Admin dashboard data
   * Data: All visits by latest, all users in their building, other admins, security guards
   */
  async getAdminDashboard(user) {
    // Get latest visits for the building
    const latestVisits = await Visit.getLatestVisitsForAdmin(user.building_id, 20);

    // Get all users in the building
    const buildingUsers = await User.getBuildingUsers(user.building_id);

    // Get other admins in the building
    const otherAdmins = await User.getOtherAdmins(user.building_id, user.id);

    // Get security guards in the building
    const securityGuards = await User.getSecurityGuards(user.building_id);

    // Get dashboard statistics
    const visitStats = await Visit.getAdminDashboardStats(user.building_id);
    const userStats = await User.getAdminDashboardStats(user.building_id);
    const stats = { ...visitStats, ...userStats };

    return {
      user_role: user.role,
      latest_visits: latestVisits,
      building_users: buildingUsers,
      other_admins: otherAdmins,
      security_guards: securityGuards,
      statistics: stats
    };
  }

  /**
   * Get Resident dashboard data
   * Data: latest visits, banned visitors, frequent visitors, upcoming visits
   */
  async getResidentDashboard(user) {
    // Get resident's latest visits
    const latestVisits = await Visit.getLatestVisitsForResident(user.id, 15);

    // Get upcoming visits (visits where entry is false)
    const upcomingVisits = await Visit.getUpcomingVisitsForResident(user.id);

    // Get banned visitors
    const bannedVisitors = await VisitorBan.getBannedVisitorsForResident(user.id);

    // Get frequent visitors
    const frequentVisitors = await FrequentVisitor.getFrequentVisitorsForResident(user.id);

    // Get resident statistics
    const visitStats = await Visit.getResidentDashboardStats(user.id);
    const banStats = await VisitorBan.getResidentDashboardStats(user.id);
    const frequentStats = await FrequentVisitor.getResidentDashboardStats(user.id);
    const stats = { ...visitStats, ...banStats, ...frequentStats };

    return {
      user_role: user.role,
      latest_visits: latestVisits,
      upcoming_visits: upcomingVisits,
      banned_visitors: bannedVisitors,
      frequent_visitors: frequentVisitors,
      statistics: stats
    };
  }

  /**
   * Get Security dashboard data
   * Data: all visits scanned for that day, all residents and basic info
   */
  async getSecurityDashboard(user) {
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get all visits scanned today (entry or exit)
    const todaysScannedVisits = await Visit.getTodaysScannedVisits(user.building_id, startOfDay, endOfDay);

    // Get all residents in the building
    const buildingResidents = await User.getBuildingResidents(user.building_id);

    // Get active visits currently inside the building
    const activeVisitsInside = await Visit.getActiveVisitsInside(user.building_id);

    // Get security statistics
    const stats = await Visit.getSecurityDashboardStats(user.building_id, startOfDay, endOfDay);

    return {
      user_role: user.role,
      todays_scanned_visits: todaysScannedVisits,
      building_residents: buildingResidents,
      active_visits_inside: activeVisitsInside,
      statistics: stats,
      scan_date: today.toISOString().split('T')[0]
    };
  }

}

export default new DashboardController();