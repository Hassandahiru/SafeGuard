// Token Management Service
// Handles JWT token storage, refresh, and expiration

class TokenService {
  constructor() {
    this.tokenKey = 'safeguard_access_token';
    this.refreshTokenKey = 'safeguard_refresh_token';
    this.expiryKey = 'safeguard_token_expiry';
    this.refreshTimeout = null;
  }

  /**
   * Store tokens after login/registration
   */
  setTokens(accessToken, refreshToken, expiresIn = '1h') {
    localStorage.setItem(this.tokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
    
    // Calculate expiry time (convert expiresIn to milliseconds)
    const expiryTime = this.calculateExpiryTime(expiresIn);
    localStorage.setItem(this.expiryKey, expiryTime.toString());
    
    // Schedule automatic refresh
    this.scheduleTokenRefresh();
  }

  /**
   * Get current access token
   */
  getAccessToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Get refresh token
   */
  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey);
  }

  /**
   * Check if token exists and is not expired
   */
  isTokenValid() {
    const token = this.getAccessToken();
    const expiry = localStorage.getItem(this.expiryKey);
    
    if (!token || !expiry) {
      return false;
    }
    
    const now = Date.now();
    return now < parseInt(expiry);
  }

  /**
   * Calculate expiry time from expiresIn string
   */
  calculateExpiryTime(expiresIn) {
    const now = Date.now();
    
    // Parse expiresIn (e.g., "1h", "30m", "7d")
    const match = expiresIn.match(/^(\d+)([hmd])$/);
    if (!match) {
      // Default to 1 hour if parsing fails
      return now + (60 * 60 * 1000);
    }
    
    const [, value, unit] = match;
    const multipliers = {
      'm': 60 * 1000,           // minutes
      'h': 60 * 60 * 1000,      // hours
      'd': 24 * 60 * 60 * 1000  // days
    };
    
    return now + (parseInt(value) * multipliers[unit]);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to refresh token');
      }
      
      if (data.success) {
        // Update access token and expiry
        localStorage.setItem(this.tokenKey, data.data.token);
        
        const expiryTime = this.calculateExpiryTime(data.data.expiresIn);
        localStorage.setItem(this.expiryKey, expiryTime.toString());
        
        // Schedule next refresh
        this.scheduleTokenRefresh();
        
        return data.data.token;
      } else {
        throw new Error(data.message || 'Token refresh failed');
      }
    } catch (error) {
      // If refresh fails, clear all tokens and redirect to login
      this.clearTokens();
      throw new Error('Session expired. Please login again.');
    }
  }

  /**
   * Schedule automatic token refresh before expiry
   */
  scheduleTokenRefresh() {
    // Clear any existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    const expiry = localStorage.getItem(this.expiryKey);
    if (!expiry) return;
    
    const expiryTime = parseInt(expiry);
    const now = Date.now();
    
    // Schedule refresh 5 minutes before expiry
    const refreshTime = expiryTime - now - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimeout = setTimeout(async () => {
        try {
          await this.refreshToken();
          console.log('Token refreshed automatically');
        } catch (error) {
          console.error('Automatic token refresh failed:', error);
          // Redirect to login or show notification
          this.handleTokenExpiry();
        }
      }, refreshTime);
    }
  }

  /**
   * Handle token expiry
   */
  handleTokenExpiry() {
    this.clearTokens();
    
    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('tokenExpired'));
    
    // You can also redirect directly here
    // window.location.href = '/login';
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader() {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }

  /**
   * Make authenticated API request with automatic token refresh
   */
  async makeAuthenticatedRequest(url, options = {}) {
    // Check if token needs refresh
    if (!this.isTokenValid()) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          await this.refreshToken();
        } catch (error) {
          throw new Error('Session expired. Please login again.');
        }
      } else {
        throw new Error('No valid session. Please login.');
      }
    }
    
    // Add authorization header
    const authHeader = this.getAuthHeader();
    if (authHeader) {
      options.headers = {
        ...options.headers,
        'Authorization': authHeader
      };
    }
    
    try {
      const response = await fetch(url, options);
      
      // If token is invalid/expired, try to refresh once
      if (response.status === 401) {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          await this.refreshToken();
          
          // Retry request with new token
          options.headers['Authorization'] = this.getAuthHeader();
          return await fetch(url, options);
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clear all tokens (logout)
   */
  clearTokens() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.expiryKey);
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Initialize token service (call on app start)
   */
  init() {
    // Schedule refresh if token exists and is valid
    if (this.isTokenValid()) {
      this.scheduleTokenRefresh();
    } else {
      // Clear invalid tokens
      this.clearTokens();
    }
  }

  /**
   * Get token expiry information
   */
  getTokenInfo() {
    const token = this.getAccessToken();
    const expiry = localStorage.getItem(this.expiryKey);
    
    if (!token || !expiry) {
      return null;
    }
    
    const expiryTime = parseInt(expiry);
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    
    return {
      hasToken: !!token,
      isValid: timeUntilExpiry > 0,
      expiresAt: new Date(expiryTime),
      timeUntilExpiry: Math.max(0, timeUntilExpiry),
      minutesUntilExpiry: Math.max(0, Math.floor(timeUntilExpiry / (60 * 1000)))
    };
  }
}

// Create singleton instance
const tokenService = new TokenService();

// Auto-initialize when imported
tokenService.init();

export default tokenService;