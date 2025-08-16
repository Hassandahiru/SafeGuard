export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  houseNumber?: string;
  profileImage?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  settings: UserSettings;
  dashboardStats: DashboardStats;
}

export interface UserSettings {
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  defaultVisitDuration: number; // in minutes
}

export interface DashboardStats {
  totalVisitors: number;
  pendingVisitors: number;
  approvedVisitors: number;
  expiredVisitors: number;
  todayVisitors: number;
  upcomingVisitors: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  houseNumber?: string;
}