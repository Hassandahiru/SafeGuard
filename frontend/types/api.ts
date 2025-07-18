// Generic API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  message: string;
  status: number;
  data: any;
}

// API request/response types
export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface VisitorListResponse {
  visitors: Visitor[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateVisitorResponse {
  visitor: Visitor;
  qrCodeUrl?: string;
  deliveryStatus: {
    success: boolean;
    method: string;
    message: string;
  };
}

// Form validation types
export interface FormErrors {
  [key: string]: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

// Contact integration
export interface DeviceContact {
  id: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
}

// Event/Reminder types
export interface CustomEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  reminderMinutes?: number;
  userId: string;
}

import { User, AuthTokens } from './user';
import { Visitor } from './visitor';