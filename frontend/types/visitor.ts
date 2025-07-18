export type VisitorStatus = 'pending' | 'approved' | 'expired' | 'used' | 'cancelled';

export interface Visitor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  status: VisitorStatus;
  visitDate: string;
  visitTime?: string;
  duration?: number; // in minutes
  purpose?: string;
  qrCode?: string;
  sixDigitCode?: string;
  hostId: string;
  hostName: string;
  createdAt: string;
  updatedAt: string;
  usedAt?: string;
  gateAgent?: string;
}

export interface VisitorInvitation {
  name: string;
  phone?: string;
  email?: string;
  visitDate: string;
  visitTime?: string;
  duration?: number;
  purpose?: string;
  deliveryMethod: 'whatsapp' | 'email' | 'sms';
}

export interface BulkInvitation {
  eventName: string;
  eventDate: string;
  eventTime: string;
  duration: number;
  location?: string;
  description?: string;
  guests: {
    name: string;
    phone?: string;
    email?: string;
  }[];
  deliveryMethod: 'whatsapp' | 'email' | 'sms';
}

export interface VisitorValidation {
  isValid: boolean;
  visitor?: Visitor;
  host?: {
    name: string;
    houseNumber: string;
    phone: string;
  };
  message: string;
}

export interface VisitorFilters {
  status?: VisitorStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface VisitorExport {
  format: 'csv' | 'pdf';
  filters?: VisitorFilters;
  includeStats?: boolean;
}