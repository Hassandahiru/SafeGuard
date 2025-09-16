import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Threaded Image Upload Service
 * Manages image processing using worker threads to avoid blocking the main thread
 */
class ImageUploadService {
  constructor() {
    this.workerPath = path.join(__dirname, '..', 'workers', 'imageProcessor.js');
    this.activeWorkers = new Set();
    this.maxWorkers = 3; // Limit concurrent workers
  }

  /**
   * Create a new worker thread
   * @returns {Promise<Worker>} Worker instance
   */
  createWorker() {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(this.workerPath);
        
        worker.on('error', (error) => {
          logger.error('Image worker error:', error);
          this.activeWorkers.delete(worker);
          reject(error);
        });

        worker.on('exit', (code) => {
          this.activeWorkers.delete(worker);
          if (code !== 0) {
            logger.warn(`Image worker stopped with exit code ${code}`);
          }
        });

        this.activeWorkers.add(worker);
        resolve(worker);

      } catch (error) {
        logger.error('Failed to create image worker:', error);
        reject(error);
      }
    });
  }

  /**
   * Execute operation in worker thread
   * @param {string} type - Operation type
   * @param {Object} data - Operation data
   * @returns {Promise<Object>} Operation result
   */
  async executeInWorker(type, data) {
    // Check worker limit
    if (this.activeWorkers.size >= this.maxWorkers) {
      throw new ExternalServiceError('Maximum number of image processing workers reached. Please try again later.');
    }

    const worker = await this.createWorker();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new ExternalServiceError('Image processing timeout'));
      }, 30000); // 30 second timeout

      worker.once('message', (message) => {
        clearTimeout(timeout);
        worker.terminate();

        if (message.success) {
          resolve(message.result);
        } else {
          reject(new ExternalServiceError(message.error?.message || 'Image processing failed'));
        }
      });

      worker.postMessage({ type, data });
    });
  }

  /**
   * Process profile picture upload
   * @param {Object} fileData - File data from multer
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Processing result
   */
  async processProfilePicture(fileData, userId) {
    try {
      logger.info(`Processing profile picture for user ${userId}`);
      
      const result = await this.executeInWorker('processProfilePicture', {
        fileData,
        userId
      });

      logger.info(`Profile picture processed successfully for user ${userId}`);
      return result;

    } catch (error) {
      logger.error(`Profile picture processing failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Process building logo upload
   * @param {Object} fileData - File data from multer
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object>} Processing result
   */
  async processBuildingLogo(fileData, buildingId) {
    try {
      logger.info(`Processing building logo for building ${buildingId}`);
      
      const result = await this.executeInWorker('processBuildingLogo', {
        fileData,
        buildingId
      });

      logger.info(`Building logo processed successfully for building ${buildingId}`);
      return result;

    } catch (error) {
      logger.error(`Building logo processing failed for building ${buildingId}:`, error);
      throw error;
    }
  }

  /**
   * Delete old image file
   * @param {string} oldFilePath - Path to old image file
   * @returns {Promise<Object>} Deletion result
   */
  async deleteOldImage(oldFilePath) {
    try {
      if (!oldFilePath) {
        return { success: true, message: 'No old image to delete' };
      }

      logger.info(`Deleting old image: ${oldFilePath}`);
      
      const result = await this.executeInWorker('deleteOldImage', {
        filePath: oldFilePath
      });

      logger.info(`Old image deleted successfully: ${oldFilePath}`);
      return result;

    } catch (error) {
      logger.error(`Failed to delete old image ${oldFilePath}:`, error);
      // Don't throw error for deletion failures, just log them
      return { success: false, error: error.message };
    }
  }

  /**
   * Get image information
   * @param {string} filePath - Path to image file
   * @returns {Promise<Object>} Image info
   */
  async getImageInfo(filePath) {
    try {
      const result = await this.executeInWorker('getImageInfo', {
        filePath
      });

      return result;

    } catch (error) {
      logger.error(`Failed to get image info for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Validate image file
   * @param {Object} file - Multer file object
   * @returns {Object} Validation result
   */
  validateImageFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size exceeds 5MB limit'
      };
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed'
      };
    }

    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: 'Invalid file extension. Only .jpg, .jpeg, .png, .gif, and .webp files are allowed'
      };
    }

    // Basic file name validation
    if (!file.originalname || file.originalname.length > 255) {
      return {
        isValid: false,
        error: 'Invalid file name'
      };
    }

    return {
      isValid: true,
      fileInfo: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        extension: fileExtension
      }
    };
  }

  /**
   * Get active workers count (for monitoring)
   * @returns {number} Number of active workers
   */
  getActiveWorkersCount() {
    return this.activeWorkers.size;
  }

  /**
   * Terminate all active workers (for graceful shutdown)
   * @returns {Promise<void>}
   */
  async terminateAllWorkers() {
    const promises = Array.from(this.activeWorkers).map(worker => {
      return new Promise((resolve) => {
        worker.once('exit', resolve);
        worker.terminate();
      });
    });

    await Promise.all(promises);
    this.activeWorkers.clear();
    logger.info('All image processing workers terminated');
  }

  /**
   * Health check for image service
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      activeWorkers: this.activeWorkers.size,
      maxWorkers: this.maxWorkers,
      workerPath: this.workerPath,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const imageUploadService = new ImageUploadService();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, terminating image workers...');
  await imageUploadService.terminateAllWorkers();
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, terminating image workers...');
  await imageUploadService.terminateAllWorkers();
});

export default imageUploadService;