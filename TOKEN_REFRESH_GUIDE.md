# SafeGuard Token Refresh System Guide

## 🔐 Overview

Your SafeGuard application now has a comprehensive token refresh system that automatically handles JWT token expiration and renewal. This guide explains how to use it.

## 🎯 What's Available

### Backend (Already Implemented)
- **Token Refresh Endpoint**: `POST /api/auth/refresh-token`
- **Automatic Token Generation**: Login and registration provide both access and refresh tokens
- **Secure Token Validation**: Built-in expiry checking and security validation

### Frontend (Just Added)
- **Enhanced AuthService**: Automatic token refresh with queue handling
- **Token Status Component**: Visual token status display
- **React Auth Hook**: Easy-to-use authentication management
- **Token Management Service**: Low-level token operations

## 🚀 How to Use Token Refresh

### 1. Automatic Token Refresh

The system automatically refreshes tokens 5 minutes before they expire:

```javascript
import { authService } from './services/authService';

// Initialize on app startup (in your App.js or _layout.js)
await authService.init();

// Token will automatically refresh when needed
```

### 2. Manual Token Refresh

```javascript
import { authService } from './services/authService';

try {
  const result = await authService.refreshToken();
  console.log('Token refreshed:', result.data.token);
} catch (error) {
  console.error('Refresh failed:', error.message);
  // Handle logout or redirect to login
}
```

### 3. Using the Auth Hook

```javascript
import React from 'react';
import { useAuth } from './hooks/useAuth';

const MyComponent = () => {
  const { 
    user, 
    isAuthenticated, 
    tokenInfo, 
    refreshToken, 
    logout 
  } = useAuth();

  const handleManualRefresh = async () => {
    try {
      await refreshToken();
      alert('Token refreshed successfully!');
    } catch (error) {
      alert('Refresh failed: ' + error.message);
    }
  };

  return (
    <div>
      {isAuthenticated && (
        <div>
          <p>Welcome, {user.first_name}!</p>
          {tokenInfo && (
            <p>Token expires in: {tokenInfo.minutesUntilExpiry} minutes</p>
          )}
          <button onClick={handleManualRefresh}>Refresh Token</button>
        </div>
      )}
    </div>
  );
};
```

### 4. Token Status Component

Add this to any screen to show token status:

```javascript
import React from 'react';
import TokenStatus from './components/TokenStatus';

const ProfileScreen = () => {
  return (
    <div>
      <h1>Profile</h1>
      <TokenStatus />  {/* Shows token expiry and refresh button */}
    </div>
  );
};
```

### 5. Making Authenticated Requests

The auth service automatically handles token refresh for API calls:

```javascript
import { authService } from './services/authService';

// This will automatically refresh token if needed before making the request
const response = await authService.makeAuthenticatedRequest('/api/visitors', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

## 🔧 Configuration

### Token Expiry Times

Configure in your backend `config/environment.js`:

```javascript
export default {
  jwt: {
    expiresIn: '1h',        // Access token expires in 1 hour
    refreshExpiresIn: '7d'  // Refresh token expires in 7 days
  }
};
```

### Frontend Configuration

The frontend automatically detects token expiry format (`1h`, `30m`, `7d`).

## 📊 Token Information

Get detailed token information:

```javascript
const tokenInfo = await authService.getTokenInfo();

if (tokenInfo) {
  console.log('Has Token:', tokenInfo.hasToken);
  console.log('Is Valid:', tokenInfo.isValid);
  console.log('Expires At:', tokenInfo.expiresAt);
  console.log('Minutes Until Expiry:', tokenInfo.minutesUntilExpiry);
}
```

## 🔔 Token Expiry Notifications

The system provides visual warnings when tokens are about to expire:

- **Green Badge**: Token valid for >1 hour
- **Yellow Badge**: Token expires in <1 hour  
- **Orange Warning**: Token expires in <15 minutes
- **Red Alert**: Token expired

## 🚨 Error Handling

### Common Scenarios

1. **Token Expired**: Automatically attempts refresh
2. **Refresh Token Expired**: Redirects to login
3. **Network Error**: Queues requests until connection restored
4. **Invalid Token**: Clears storage and redirects to login

### Manual Error Handling

```javascript
import { authService } from './services/authService';

try {
  const data = await authService.getProfile();
} catch (error) {
  if (error.message.includes('Session expired')) {
    // Redirect to login
    router.push('/login');
  } else {
    // Handle other errors
    console.error('API Error:', error);
  }
}
```

## 🎛️ Advanced Usage

### Queue Management

Multiple requests during token refresh are automatically queued:

```javascript
// These will all wait for token refresh to complete
const [users, visitors, visits] = await Promise.all([
  authService.makeAuthenticatedRequest('/api/users'),
  authService.makeAuthenticatedRequest('/api/visitors'),
  authService.makeAuthenticatedRequest('/api/visits')
]);
```

### Custom Token Refresh Handling

```javascript
import { authService } from './services/authService';

// Listen for automatic refresh events
const originalRefresh = authService.refreshToken;
authService.refreshToken = async (...args) => {
  console.log('Token refresh started...');
  try {
    const result = await originalRefresh.call(authService, ...args);
    console.log('Token refresh successful');
    return result;
  } catch (error) {
    console.log('Token refresh failed:', error.message);
    throw error;
  }
};
```

## 🔒 Security Features

1. **Automatic Cleanup**: Expired tokens are automatically removed
2. **Queue Protection**: Prevents multiple simultaneous refresh attempts
3. **Secure Storage**: Tokens stored in secure AsyncStorage
4. **Timeout Management**: Automatic scheduling prevents memory leaks
5. **Error Recovery**: Graceful handling of network and server errors

## 🛠️ Integration Steps

### Step 1: Update Your App Layout

Add the AuthProvider to your app root:

```javascript
// app/_layout.js
import { AuthProvider } from '../hooks/useAuth';
import { authService } from '../services/authService';

export default function RootLayout() {
  // Initialize auth service
  useEffect(() => {
    authService.init();
  }, []);

  return (
    <AuthProvider>
      {/* Your app content */}
    </AuthProvider>
  );
}
```

### Step 2: Update Login/Register Screens

```javascript
// components/auth/LoginScreen.js
import { useAuth } from '../../hooks/useAuth';

const LoginScreen = () => {
  const { login } = useAuth();

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    if (result.success) {
      // Token automatically stored and scheduled for refresh
      router.push('/dashboard');
    }
  };
};
```

### Step 3: Add Token Status to Profile

```javascript
// app/(tabs)/profile.js
import TokenStatus from '../components/TokenStatus';

const ProfileScreen = () => {
  return (
    <div>
      <TokenStatus />
      {/* Rest of profile content */}
    </div>
  );
};
```

## 📱 Testing Token Refresh

### Manual Testing

1. **Login** to get fresh tokens
2. **Wait for expiry warning** (or modify expiry time for testing)
3. **Click "Refresh Token"** button
4. **Verify new expiry time** is updated

### Programmatic Testing

```javascript
// For testing - force token expiry
localStorage.setItem('tokenExpiry', (Date.now() - 1000).toString());

// Test automatic refresh
const result = await authService.isAuthenticated(); // Should trigger refresh
```

## 🎉 Benefits

1. **Seamless User Experience**: No unexpected logouts
2. **Automatic Management**: No manual token handling required
3. **Security**: Tokens regularly refreshed for better security
4. **Error Recovery**: Graceful handling of network issues
5. **Performance**: Request queuing prevents duplicate refresh calls
6. **Monitoring**: Visual feedback on token status

## 🆘 Troubleshooting

### Token Not Refreshing
- Check if refresh endpoint is correct (`/api/auth/refresh-token`)
- Verify refresh token is stored in AsyncStorage
- Check network connectivity

### Automatic Refresh Not Working
- Ensure `authService.init()` is called on app startup
- Check if `scheduleTokenRefresh()` is being called after login

### Logout Issues
- Clear AsyncStorage manually if needed
- Check if logout endpoint is accessible

---

**Your token refresh system is now ready to use! 🎉**

The system will automatically keep users logged in and provide a smooth authentication experience.