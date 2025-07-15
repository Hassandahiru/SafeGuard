import QRCode from 'qrcode';
import { generateQRCode } from '../utils/helpers.js';
import { qrcode } from '../utils/logger.js';
import { QRCodeError } from '../utils/errors/index.js';
import config from '../config/environment.js';

class QRCodeService {
  /**
   * Generate QR code for visit
   * @param {Object} visitData - Visit data
   * @returns {Promise<Object>} QR code data
   */
  async generateVisitQRCode(visitData) {
    try {
      // Generate unique QR code string
      const qrCodeString = generateQRCode();
      
      // Calculate expiry time
      const expiryTime = visitData.expected_end || 
        new Date(Date.now() + config.building.qrCodeExpiryHours * 60 * 60 * 1000);

      // Create QR code data payload
      const qrCodeData = {
        visit_id: visitData.id,
        building_id: visitData.building_id,
        host_id: visitData.host_id,
        code: qrCodeString,
        expires_at: expiryTime,
        generated_at: new Date(),
        title: visitData.title,
        expected_start: visitData.expected_start,
        expected_end: visitData.expected_end,
        max_visitors: visitData.max_visitors || 1,
        visit_type: visitData.visit_type || 'single'
      };

      // Generate QR code image
      const qrCodeBuffer = await this.generateQRCodeImage(qrCodeString);
      
      // Convert to base64 for easy transmission
      const qrCodeBase64 = qrCodeBuffer.toString('base64');
      
      qrcode.info('QR code generated successfully', {
        visitId: visitData.id,
        qrCode: qrCodeString,
        expiresAt: expiryTime
      });

      return {
        code: qrCodeString,
        data: qrCodeData,
        image: qrCodeBase64,
        imageUrl: `data:image/png;base64,${qrCodeBase64}`,
        expiresAt: expiryTime
      };
    } catch (error) {
      qrcode.error('QR code generation failed', {
        visitId: visitData.id,
        error: error.message
      });
      throw QRCodeError.generationFailed(error);
    }
  }

  /**
   * Generate QR code image buffer
   * @param {string} data - Data to encode
   * @returns {Promise<Buffer>} QR code image buffer
   */
  async generateQRCodeImage(data) {
    try {
      const options = {
        type: 'png',
        width: config.qrCode.size,
        margin: config.qrCode.margin,
        color: {
          dark: config.qrCode.color.dark,
          light: config.qrCode.color.light
        },
        errorCorrectionLevel: 'M'
      };

      return await QRCode.toBuffer(data, options);
    } catch (error) {
      throw QRCodeError.generationFailed(error);
    }
  }

  /**
   * Generate QR code as SVG
   * @param {string} data - Data to encode
   * @returns {Promise<string>} QR code SVG string
   */
  async generateQRCodeSVG(data) {
    try {
      const options = {
        type: 'svg',
        width: config.qrCode.size,
        margin: config.qrCode.margin,
        color: {
          dark: config.qrCode.color.dark,
          light: config.qrCode.color.light
        },
        errorCorrectionLevel: 'M'
      };

      return await QRCode.toString(data, options);
    } catch (error) {
      throw QRCodeError.generationFailed(error);
    }
  }

  /**
   * Generate QR code as data URL
   * @param {string} data - Data to encode
   * @returns {Promise<string>} QR code data URL
   */
  async generateQRCodeDataURL(data) {
    try {
      const options = {
        width: config.qrCode.size,
        margin: config.qrCode.margin,
        color: {
          dark: config.qrCode.color.dark,
          light: config.qrCode.color.light
        },
        errorCorrectionLevel: 'M'
      };

      return await QRCode.toDataURL(data, options);
    } catch (error) {
      throw QRCodeError.generationFailed(error);
    }
  }

  /**
   * Validate QR code format
   * @param {string} qrCode - QR code string
   * @returns {boolean} Validation result
   */
  validateQRCodeFormat(qrCode) {
    const qrCodePattern = /^SG_[A-Z0-9]{32}$/;
    return qrCodePattern.test(qrCode);
  }

  /**
   * Parse QR code data
   * @param {string} qrCode - QR code string
   * @returns {Object} Parsed QR code data
   */
  parseQRCode(qrCode) {
    if (!this.validateQRCodeFormat(qrCode)) {
      throw QRCodeError.invalidCode(qrCode);
    }

    return {
      code: qrCode,
      prefix: qrCode.substring(0, 3),
      identifier: qrCode.substring(3),
      isValid: true
    };
  }

  /**
   * Generate QR code for visitor check-in
   * @param {Object} visitorData - Visitor data
   * @returns {Promise<Object>} QR code data
   */
  async generateVisitorQRCode(visitorData) {
    try {
      const qrCodeString = generateQRCode();
      
      const qrCodeData = {
        visitor_id: visitorData.id,
        building_id: visitorData.building_id,
        name: visitorData.name,
        phone: visitorData.phone,
        code: qrCodeString,
        generated_at: new Date(),
        type: 'visitor_checkin'
      };

      const qrCodeBuffer = await this.generateQRCodeImage(qrCodeString);
      const qrCodeBase64 = qrCodeBuffer.toString('base64');

      return {
        code: qrCodeString,
        data: qrCodeData,
        image: qrCodeBase64,
        imageUrl: `data:image/png;base64,${qrCodeBase64}`
      };
    } catch (error) {
      throw QRCodeError.generationFailed(error);
    }
  }

  /**
   * Generate QR code for emergency alert
   * @param {Object} emergencyData - Emergency data
   * @returns {Promise<Object>} QR code data
   */
  async generateEmergencyQRCode(emergencyData) {
    try {
      const qrCodeString = generateQRCode();
      
      const qrCodeData = {
        alert_id: emergencyData.id,
        building_id: emergencyData.building_id,
        type: 'emergency_alert',
        emergency_type: emergencyData.type,
        location: emergencyData.location,
        code: qrCodeString,
        generated_at: new Date()
      };

      const qrCodeBuffer = await this.generateQRCodeImage(qrCodeString);
      const qrCodeBase64 = qrCodeBuffer.toString('base64');

      return {
        code: qrCodeString,
        data: qrCodeData,
        image: qrCodeBase64,
        imageUrl: `data:image/png;base64,${qrCodeBase64}`
      };
    } catch (error) {
      throw QRCodeError.generationFailed(error);
    }
  }

  /**
   * Generate temporary access QR code
   * @param {Object} accessData - Access data
   * @returns {Promise<Object>} QR code data
   */
  async generateTempAccessQRCode(accessData) {
    try {
      const qrCodeString = generateQRCode();
      const expiryTime = new Date(Date.now() + (accessData.durationHours || 1) * 60 * 60 * 1000);
      
      const qrCodeData = {
        building_id: accessData.building_id,
        granted_by: accessData.granted_by,
        access_level: accessData.access_level || 'basic',
        code: qrCodeString,
        expires_at: expiryTime,
        generated_at: new Date(),
        type: 'temp_access',
        purpose: accessData.purpose || 'temporary access'
      };

      const qrCodeBuffer = await this.generateQRCodeImage(qrCodeString);
      const qrCodeBase64 = qrCodeBuffer.toString('base64');

      return {
        code: qrCodeString,
        data: qrCodeData,
        image: qrCodeBase64,
        imageUrl: `data:image/png;base64,${qrCodeBase64}`,
        expiresAt: expiryTime
      };
    } catch (error) {
      throw QRCodeError.generationFailed(error);
    }
  }

  /**
   * Generate QR code for building information
   * @param {Object} buildingData - Building data
   * @returns {Promise<Object>} QR code data
   */
  async generateBuildingInfoQRCode(buildingData) {
    try {
      const qrCodeString = generateQRCode();
      
      const qrCodeData = {
        building_id: buildingData.id,
        name: buildingData.name,
        address: buildingData.address,
        phone: buildingData.phone,
        code: qrCodeString,
        generated_at: new Date(),
        type: 'building_info'
      };

      const qrCodeBuffer = await this.generateQRCodeImage(qrCodeString);
      const qrCodeBase64 = qrCodeBuffer.toString('base64');

      return {
        code: qrCodeString,
        data: qrCodeData,
        image: qrCodeBase64,
        imageUrl: `data:image/png;base64,${qrCodeBase64}`
      };
    } catch (error) {
      throw QRCodeError.generationFailed(error);
    }
  }

  /**
   * Batch generate QR codes
   * @param {Array} dataArray - Array of data objects
   * @param {string} type - QR code type
   * @returns {Promise<Array>} Array of QR code data
   */
  async batchGenerateQRCodes(dataArray, type = 'visit') {
    try {
      const qrCodes = [];
      
      for (const data of dataArray) {
        let qrCodeData;
        
        switch (type) {
          case 'visit':
            qrCodeData = await this.generateVisitQRCode(data);
            break;
          case 'visitor':
            qrCodeData = await this.generateVisitorQRCode(data);
            break;
          case 'emergency':
            qrCodeData = await this.generateEmergencyQRCode(data);
            break;
          case 'temp_access':
            qrCodeData = await this.generateTempAccessQRCode(data);
            break;
          case 'building_info':
            qrCodeData = await this.generateBuildingInfoQRCode(data);
            break;
          default:
            throw new Error(`Unknown QR code type: ${type}`);
        }
        
        qrCodes.push(qrCodeData);
      }

      qrcode.info('Batch QR codes generated', {
        count: qrCodes.length,
        type: type
      });

      return qrCodes;
    } catch (error) {
      qrcode.error('Batch QR code generation failed', {
        error: error.message,
        type: type,
        count: dataArray.length
      });
      throw QRCodeError.generationFailed(error);
    }
  }

  /**
   * Get QR code statistics
   * @param {string} buildingId - Building ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} QR code statistics
   */
  async getQRCodeStats(buildingId, startDate, endDate) {
    try {
      // This would typically query the database for QR code usage statistics
      // For now, returning a mock structure
      return {
        totalGenerated: 0,
        totalScanned: 0,
        activeQRCodes: 0,
        expiredQRCodes: 0,
        scanSuccessRate: 0,
        averageScansPerCode: 0,
        peakUsageHour: 0,
        mostUsedGate: null
      };
    } catch (error) {
      qrcode.error('Failed to get QR code statistics', {
        buildingId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate QR code expiry
   * @param {Object} qrCodeData - QR code data
   * @returns {boolean} Validation result
   */
  validateQRCodeExpiry(qrCodeData) {
    if (!qrCodeData.expires_at) {
      return true; // No expiry set
    }

    const now = new Date();
    const expiryTime = new Date(qrCodeData.expires_at);
    
    return now < expiryTime;
  }

  /**
   * Get QR code info
   * @param {string} qrCode - QR code string
   * @returns {Object} QR code information
   */
  getQRCodeInfo(qrCode) {
    const parsed = this.parseQRCode(qrCode);
    
    return {
      ...parsed,
      generatedAt: null, // Would be fetched from database
      expiresAt: null,   // Would be fetched from database
      scanCount: 0,      // Would be fetched from database
      lastScanned: null, // Would be fetched from database
      status: 'active'   // Would be calculated based on expiry and usage
    };
  }
}

export default new QRCodeService();