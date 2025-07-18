// Mock authentication for testing
export const mockAuthService = {
  login: async (credentials) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock login validation
    if (credentials.email === 'test@example.com' && credentials.password === 'password') {
      return {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'test@example.com',
          phone: '+234 703 310 86608',
          houseNumber: 'A-123',
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
        },
      };
    } else {
      throw new Error('Invalid credentials');
    }
  },

  register: async (userData) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      user: {
        id: '2',
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        houseNumber: userData.houseNumber,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'mock-access-token-new',
        refreshToken: 'mock-refresh-token-new',
        expiresIn: 3600,
      },
    };
  },

  logout: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },
};