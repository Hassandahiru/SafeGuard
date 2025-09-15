import { parentPort, workerData } from 'worker_threads';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Image Processing Worker Thread
 * Handles image resize, optimization, and file operations without blocking main thread
 */

class ImageProcessor {
  constructor() {
    this.uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    this.profilesDir = path.join(this.uploadsDir, 'profiles');
    this.buildingsDir = path.join(this.uploadsDir, 'buildings');
    this.tempDir = path.join(this.uploadsDir, 'temp');
  }

  /**
   * Initialize upload directories
   */
  async initializeDirectories() {
    const dirs = [this.uploadsDir, this.profilesDir, this.buildingsDir, this.tempDir];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch (error) {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Process profile picture
   * @param {Object} fileData - File data from multer
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Processing result
   */
  async processProfilePicture(fileData, userId) {
    try {
      await this.initializeDirectories();

      const originalName = fileData.originalname;
      const fileExtension = path.extname(originalName).toLowerCase();
      const fileName = `profile_${userId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(this.profilesDir, fileName);
      const relativePath = `uploads/profiles/${fileName}`;

      // Process image with sharp for optimization
      let processedBuffer;
      
      if (this.isImageFile(fileExtension)) {
        // Resize and optimize image
        processedBuffer = await sharp(fileData.buffer)
          .resize(400, 400, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({
            quality: 85,
            progressive: true
          })
          .toBuffer();
      } else {
        processedBuffer = fileData.buffer;
      }

      // Save processed image
      await fs.writeFile(filePath, processedBuffer);

      // Verify file was written correctly
      const stats = await fs.stat(filePath);

      return {
        success: true,
        data: {
          fileName,
          filePath: relativePath,
          originalName,
          size: stats.size,
          mimeType: fileData.mimetype,
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Process building logo
   * @param {Object} fileData - File data from multer
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object>} Processing result
   */
  async processBuildingLogo(fileData, buildingId) {
    try {
      await this.initializeDirectories();

      const originalName = fileData.originalname;
      const fileExtension = path.extname(originalName).toLowerCase();
      const fileName = `building_${buildingId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(this.buildingsDir, fileName);
      const relativePath = `uploads/buildings/${fileName}`;

      // Process image with sharp for optimization
      let processedBuffer;
      
      if (this.isImageFile(fileExtension)) {
        // Resize and optimize logo (larger size for buildings)
        processedBuffer = await sharp(fileData.buffer)
          .resize(800, 400, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: 90,
            progressive: true
          })
          .toBuffer();
      } else {
        processedBuffer = fileData.buffer;
      }

      // Save processed image
      await fs.writeFile(filePath, processedBuffer);

      // Verify file was written correctly
      const stats = await fs.stat(filePath);

      return {
        success: true,
        data: {
          fileName,
          filePath: relativePath,
          originalName,
          size: stats.size,
          mimeType: fileData.mimetype,
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack
        }
      };
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

      const fullPath = path.join(__dirname, '..', '..', oldFilePath);
      
      try {
        await fs.access(fullPath);
        await fs.unlink(fullPath);
        return { success: true, message: 'Old image deleted successfully' };
      } catch (error) {
        if (error.code === 'ENOENT') {
          return { success: true, message: 'Old image file not found (already deleted)' };
        }
        throw error;
      }

    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Check if file is an image
   * @param {string} extension - File extension
   * @returns {boolean} Is image file
   */
  isImageFile(extension) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.includes(extension);
  }

  /**
   * Get image info without processing
   * @param {string} filePath - Path to image file
   * @returns {Promise<Object>} Image info
   */
  async getImageInfo(filePath) {
    try {
      const fullPath = path.join(__dirname, '..', '..', filePath);
      const stats = await fs.stat(fullPath);
      
      let metadata = {};
      if (this.isImageFile(path.extname(filePath))) {
        try {
          metadata = await sharp(fullPath).metadata();
        } catch (error) {
          // If sharp fails, continue without metadata
        }
      }

      return {
        success: true,
        data: {
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          ...metadata
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack
        }
      };
    }
  }
}

// Worker thread execution
if (parentPort) {
  const processor = new ImageProcessor();

  parentPort.on('message', async (message) => {
    const { type, data } = message;

    try {
      let result;

      switch (type) {
        case 'processProfilePicture':
          result = await processor.processProfilePicture(data.fileData, data.userId);
          break;

        case 'processBuildingLogo':
          result = await processor.processBuildingLogo(data.fileData, data.buildingId);
          break;

        case 'deleteOldImage':
          result = await processor.deleteOldImage(data.filePath);
          break;

        case 'getImageInfo':
          result = await processor.getImageInfo(data.filePath);
          break;

        default:
          result = {
            success: false,
            error: { message: `Unknown operation type: ${type}` }
          };
      }

      parentPort.postMessage({ success: true, result });

    } catch (error) {
      parentPort.postMessage({
        success: false,
        error: {
          message: error.message,
          stack: error.stack
        }
      });
    }
  });
}

export default ImageProcessor;