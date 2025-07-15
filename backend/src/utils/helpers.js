import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { VALIDATION_PATTERNS } from './constants.js';

/**
 * Generate a unique QR code string
 * @returns {string} QR code string
 */
const generateQRCode = () => {
  const randomPart = crypto.randomBytes(16).toString('hex').toUpperCase();
  return `SG_${randomPart}`;
};

/**
 * Generate a secure random token
 * @param {number} length - Token length
 * @returns {string} Random token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const bcrypt = await import('bcrypt');
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Match result
 */
const comparePassword = async (password, hash) => {
  const bcrypt = await import('bcrypt');
  return await bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 * @param {object} payload - Token payload
 * @param {string} expiresIn - Token expiration
 * @returns {string} JWT token
 */
const generateJWT = async (payload, expiresIn = '24h') => {
  const jwt = await import('jsonwebtoken');
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
const verifyJWT = async (token) => {
  const jwt = await import('jsonwebtoken');
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Sanitize user input
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} Validation result
 */
const isValidEmail = (email) => {
  return VALIDATION_PATTERNS.EMAIL.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number
 * @returns {boolean} Validation result
 */
const isValidPhone = (phone) => {
  return VALIDATION_PATTERNS.PHONE.test(phone);
};

/**
 * Validate UUID format
 * @param {string} uuid - UUID string
 * @returns {boolean} Validation result
 */
const isValidUUID = (uuid) => {
  return VALIDATION_PATTERNS.UUID.test(uuid);
};

/**
 * Validate QR code format
 * @param {string} qrCode - QR code string
 * @returns {boolean} Validation result
 */
const isValidQRCode = (qrCode) => {
  return VALIDATION_PATTERNS.QR_CODE.test(qrCode);
};

/**
 * Format phone number to international format
 * @param {string} phone - Phone number
 * @param {string} countryCode - Default country code
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phone, countryCode = '+234') => {
  if (!phone) return phone;
  
  let formatted = phone.replace(/\D/g, ''); // Remove non-digits
  
  // Add country code if not present
  if (!formatted.startsWith(countryCode.replace('+', ''))) {
    // Remove leading zero if present
    if (formatted.startsWith('0')) {
      formatted = formatted.substring(1);
    }
    formatted = countryCode + formatted;
  }
  
  return formatted;
};

/**
 * Generate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} Pagination metadata
 */
const generatePaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
};

/**
 * Calculate time difference in human readable format
 * @param {Date} date - Date to compare
 * @returns {string} Human readable time difference
 */
const timeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return new Date(date).toLocaleDateString();
};

/**
 * Create API response object
 * @param {boolean} success - Success status
 * @param {*} data - Response data
 * @param {string} message - Response message
 * @param {object} meta - Additional metadata
 * @returns {object} API response object
 */
const createResponse = (success, data = null, message = null, meta = null) => {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) response.data = data;
  if (message) response.message = message;
  if (meta) response.meta = meta;
  
  return response;
};

/**
 * Extract file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension
 */
const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const extension = getFileExtension(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}.${extension}`;
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove undefined and null values from object
 * @param {object} obj - Object to clean
 * @returns {object} Cleaned object
 */
const cleanObject = (obj) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
const toTitleCase = (str) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

/**
 * Generate random integer between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Check if object is empty
 * @param {object} obj - Object to check
 * @returns {boolean} True if empty
 */
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency
 */
const formatCurrency = (amount, currency = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Generate analytics date range
 * @param {string} period - Time period (daily, weekly, monthly)
 * @returns {object} Start and end dates
 */
const getAnalyticsDateRange = (period) => {
  const now = new Date();
  const endDate = new Date(now);
  let startDate;
  
  switch (period) {
    case 'daily':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'yearly':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  return { startDate, endDate };
};

export {
  generateQRCode,
  generateToken,
  hashPassword,
  comparePassword,
  generateJWT,
  verifyJWT,
  sanitizeInput,
  isValidEmail,
  isValidPhone,
  isValidUUID,
  isValidQRCode,
  formatPhoneNumber,
  generatePaginationMeta,
  timeAgo,
  createResponse,
  getFileExtension,
  generateUniqueFilename,
  sleep,
  deepClone,
  cleanObject,
  toTitleCase,
  randomInt,
  isEmpty,
  formatCurrency,
  getAnalyticsDateRange
};