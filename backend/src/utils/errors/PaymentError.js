import AppError from './AppError.js';

/**
 * Custom error class for payment processing errors
 * Used for Paystack integration failures and payment-related issues
 */
class PaymentError extends AppError {
  constructor(message, statusCode = 400, errorCode = 'PAYMENT_ERROR') {
    super(message, statusCode, errorCode);
    this.name = 'PaymentError';
  }
}

export default PaymentError;