import AppError from './AppError.js';

class QRCodeError extends AppError {
  constructor(message, code = null, details = null) {
    super(message, 400, 'QR_CODE_ERROR');
    
    this.name = 'QRCodeError';
    this.code = code;
    this.details = details;
  }

  static generationFailed(originalError) {
    return new QRCodeError(
      'QR code generation failed',
      'GENERATION_FAILED',
      originalError ? originalError.message : null
    );
  }

  static invalidCode(code) {
    return new QRCodeError(
      'Invalid QR code format',
      'INVALID_FORMAT',
      `Code: ${code}`
    );
  }

  static expired(code) {
    return new QRCodeError(
      'QR code has expired',
      'EXPIRED',
      `Code: ${code}`
    );
  }

  static alreadyScanned(code) {
    return new QRCodeError(
      'QR code has already been scanned',
      'ALREADY_SCANNED',
      `Code: ${code}`
    );
  }

  static visitNotFound(code) {
    return new QRCodeError(
      'Visit associated with QR code not found',
      'VISIT_NOT_FOUND',
      `Code: ${code}`
    );
  }

  static visitCancelled(code) {
    return new QRCodeError(
      'Visit associated with QR code has been cancelled',
      'VISIT_CANCELLED',
      `Code: ${code}`
    );
  }

  static visitCompleted(code) {
    return new QRCodeError(
      'Visit associated with QR code has been completed',
      'VISIT_COMPLETED',
      `Code: ${code}`
    );
  }

  static scaningNotAllowed(reason) {
    return new QRCodeError(
      'QR code scanning not allowed',
      'SCANNING_NOT_ALLOWED',
      reason
    );
  }

  toJSON() {
    return {
      ...super.toJSON(),
      code: this.code,
      details: this.details
    };
  }
}

export default QRCodeError;