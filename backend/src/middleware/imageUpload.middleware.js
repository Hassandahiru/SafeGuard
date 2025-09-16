import multer from 'multer';
import path from 'path';
import { logger } from '../utils/logger.js';
import imageUploadService from '../services/imageUpload.service.js';
import { ValidationError, FileUploadError } from '../utils/errors/index.js';

/**
 * Image Upload Middleware
 * Handles file upload validation and processing using multer
 */

// Configure multer for memory storage (we'll process in worker threads)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  try {
    // Validate file using our service
    const validation = imageUploadService.validateImageFile(file);
    
    if (!validation.isValid) {
      logger.warn(`File upload validation failed: ${validation.error}`, {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      });
      return cb(new FileUploadError(validation.error), false);
    }

    // Log successful validation
    logger.info('File upload validation passed', {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    });

    cb(null, true);

  } catch (error) {
    logger.error('File filter error:', error);
    cb(new FileUploadError('File validation failed'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file at a time
    fields: 10, // Limit form fields
    fieldNameSize: 100, // Limit field name size
    fieldSize: 1024 * 1024 // 1MB limit for field values
  }
});

/**
 * Middleware for profile picture upload
 */
export const uploadProfilePicture = (req, res, next) => {
  const singleUpload = upload.single('profilePicture');
  
  singleUpload(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            return next(new FileUploadError('File size exceeds 5MB limit'));
          case 'LIMIT_FILE_COUNT':
            return next(new FileUploadError('Only one file allowed'));
          case 'LIMIT_UNEXPECTED_FILE':
            return next(new FileUploadError('Unexpected field. Use "profilePicture" field name'));
          case 'LIMIT_FIELD_KEY':
            return next(new FileUploadError('Field name too long'));
          case 'LIMIT_FIELD_VALUE':
            return next(new FileUploadError('Field value too large'));
          case 'LIMIT_FIELD_COUNT':
            return next(new FileUploadError('Too many fields'));
          default:
            return next(new FileUploadError(`Upload error: ${error.message}`));
        }
      }
      return next(error);
    }

    // Check if file was uploaded
    if (!req.file) {
      return next(new FileUploadError('No file uploaded. Please select a profile picture.'));
    }

    // Add upload metadata to request
    req.uploadMetadata = {
      type: 'profile',
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    logger.info('Profile picture upload middleware passed', {
      userId: req.user?.id,
      fileName: req.file.originalname,
      size: req.file.size
    });

    next();
  });
};

/**
 * Middleware for building logo upload
 */
export const uploadBuildingLogo = (req, res, next) => {
  const singleUpload = upload.single('buildingLogo');
  
  singleUpload(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            return next(new ValidationError('File size exceeds 5MB limit'));
          case 'LIMIT_FILE_COUNT':
            return next(new ValidationError('Only one file allowed'));
          case 'LIMIT_UNEXPECTED_FILE':
            return next(new ValidationError('Unexpected field. Use "buildingLogo" field name'));
          case 'LIMIT_FIELD_KEY':
            return next(new ValidationError('Field name too long'));
          case 'LIMIT_FIELD_VALUE':
            return next(new ValidationError('Field value too large'));
          case 'LIMIT_FIELD_COUNT':
            return next(new ValidationError('Too many fields'));
          default:
            return next(new ValidationError(`Upload error: ${error.message}`));
        }
      }
      return next(error);
    }

    // Check if file was uploaded
    if (!req.file) {
      return next(new ValidationError('No file uploaded. Please select a building logo.'));
    }

    // Add upload metadata to request
    req.uploadMetadata = {
      type: 'building',
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    logger.info('Building logo upload middleware passed', {
      userId: req.user?.id,
      buildingId: req.user?.building_id,
      fileName: req.file.originalname,
      size: req.file.size
    });

    next();
  });
};

/**
 * Generic image upload middleware (auto-detects type from field name)
 */
export const uploadImage = (req, res, next) => {
  const fields = upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'buildingLogo', maxCount: 1 }
  ]);
  
  fields(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            return next(new ValidationError('File size exceeds 5MB limit'));
          case 'LIMIT_FILE_COUNT':
            return next(new ValidationError('Only one file per field allowed'));
          case 'LIMIT_UNEXPECTED_FILE':
            return next(new ValidationError('Unexpected field. Use "profilePicture" or "buildingLogo" field names'));
          default:
            return next(new ValidationError(`Upload error: ${error.message}`));
        }
      }
      return next(error);
    }

    // Check which type of file was uploaded
    if (req.files?.profilePicture) {
      req.file = req.files.profilePicture[0];
      req.uploadMetadata = {
        type: 'profile',
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      };
    } else if (req.files?.buildingLogo) {
      req.file = req.files.buildingLogo[0];
      req.uploadMetadata = {
        type: 'building',
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      };
    } else {
      return next(new ValidationError('No valid image file uploaded. Use "profilePicture" or "buildingLogo" field names.'));
    }

    logger.info('Generic image upload middleware passed', {
      type: req.uploadMetadata.type,
      userId: req.user?.id,
      fileName: req.file.originalname,
      size: req.file.size
    });

    next();
  });
};

/**
 * Middleware to validate image upload permissions
 */
export const validateImageUploadPermissions = (req, res, next) => {
  const { user } = req;
  const uploadType = req.uploadMetadata?.type;

  if (!user) {
    return next(new ValidationError('Authentication required for image upload'));
  }

  // Profile picture - all authenticated users can upload
  if (uploadType === 'profile') {
    return next();
  }

  // Building logo - only admins can upload
  if (uploadType === 'building') {
    const adminRoles = ['super_admin', 'building_admin'];
    if (!adminRoles.includes(user.role)) {
      return next(new ValidationError('Only building administrators can upload building logos'));
    }
    return next();
  }

  return next(new ValidationError('Invalid upload type'));
};

/**
 * Error handling middleware for image uploads
 */
export const handleImageUploadError = (error, req, res, next) => {
  // Clean up any uploaded file data from memory
  if (req.file) {
    req.file = null;
  }
  if (req.files) {
    req.files = null;
  }

  logger.error('Image upload error:', {
    error: error.message,
    stack: error.stack,
    userId: req.user?.id,
    uploadMetadata: req.uploadMetadata
  });

  // Pass to main error handler
  next(error);
};

/**
 * Middleware to log successful image uploads
 */
export const logImageUpload = (req, res, next) => {
  if (req.uploadMetadata && req.file) {
    logger.info('Image upload completed successfully', {
      type: req.uploadMetadata.type,
      userId: req.user?.id,
      buildingId: req.user?.building_id,
      originalName: req.uploadMetadata.originalName,
      size: req.uploadMetadata.size,
      mimeType: req.uploadMetadata.mimeType
    });
  }
  next();
};

export default {
  uploadProfilePicture,
  uploadBuildingLogo,
  uploadImage,
  validateImageUploadPermissions,
  handleImageUploadError,
  logImageUpload
};