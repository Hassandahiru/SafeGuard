import AppError from './AppError.js';

/**
 * Custom error class for file upload related errors
 * Used for image upload, file validation, and file processing errors
 */
class FileUploadError extends AppError {
  constructor(message, statusCode = 400, errorCode = 'FILE_UPLOAD_ERROR') {
    super(message, statusCode, errorCode);
    this.name = 'FileUploadError';
  }
}

export default FileUploadError;