# Google OAuth2 Authentication Setup Guide

This guide explains how to set up and configure the Google OAuth2 authentication system for the Kelvor idle RPG game.

## Overview

The authentication system provides:
- Google OAuth2 login/logout functionality
- User profile management
- Session management with automatic token refresh
- Cloud save synchronization
- User statistics tracking
- Integration with the existing save/load system

## Prerequisites

1. Google Cloud Project with OAuth2 consent screen configured
2. Authorized redirect URI for your application
3. Client ID and Client Secret from Google Cloud Console

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google OAuth2 API
4. Configure the OAuth2 consent screen:
   - Application name: "Kelvor Idle RPG"
   - User support email: your email
   - Developer contact information: your email
   - Scopes for Google APIs: Email, Profile, OpenID Connect

### 2. Create OAuth2 Credentials

1. Go to "Credentials" in the Google Cloud Console
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Select "Web application"
4. Name: "Kelvor Web Client"
5. Authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - `https://yourdomain.com` (for production)
6. Authorized redirect URIs:
   - `http://localhost:5173/auth/callback` (for development)
   - `https://yourdomain.com/auth/callback` (for production)
7. Save and copy the Client ID and Client Secret

### 3. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Google credentials:
   ```
   GOOGLE_CLIENT_ID=your_actual_client_id
   GOOGLE_CLIENT_SECRET=your_actual_client_secret
   ```

3. For Vite development, also add:
   ```
   VITE_GOOGLE_CLIENT_ID=your_actual_client_id
   ```

### 4. Vite Configuration

Update your `vite.config.ts` to handle environment variables:

```typescript
export default defineConfig({
  define: {
    'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
  },
  // ... other config
});
```

## Usage

### Basic Authentication

```typescript
import { authService } from '@/core/AuthService';

// Login with Google
await authService.loginWithGoogle();

// Logout
await authService.logout();

// Check authentication status
const isAuthenticated = authService.isAuthenticated();

// Get current user
const user = authService.getCurrentUser();
```

### Authentication UI Components

```typescript
import { AuthComponent } from '@/components/AuthComponent';
import { UserProfileComponent } from '@/components/UserProfileComponent';

// Create auth component in a scene
const authComponent = new AuthComponent(scene, {
  position: { x: width - 320, y: 20 },
  width: 300,
  height: 120,
  showUserInfo: true,
  showLogoutButton: true,
});

// Create user profile component
const profileComponent = new UserProfileComponent(scene, {
  position: { x: 100, y: 100 },
  width: 400,
  height: 500,
});
```

### Enhanced Save System

```typescript
import { AuthSaveLoadSystem } from '@/core/AuthSaveLoadSystem';

const saveLoadSystem = new AuthSaveLoadSystem({
  cloudSync: true,
  autoCloudBackup: true,
  encryptionEnabled: true,
});

// Save game (automatically syncs to cloud if authenticated)
await saveLoadSystem.saveGame(gameState);

// Load game (prioritizes cloud saves if available)
const result = await saveLoadSystem.loadGame();
```

## Features

### 1. User Authentication
- Google OAuth2 login with popup flow
- Automatic token refresh
- Session management with timeout
- Secure token storage

### 2. User Profiles
- Display user information (name, email, avatar)
- Track user statistics (play time, login streaks)
- User settings management
- Achievement tracking

### 3. Cloud Saves
- Automatic cloud synchronization
- User-specific save games
- Cross-device synchronization
- Backup and restore functionality

### 4. Security Features
- Secure state parameter validation
- Token expiration handling
- Activity tracking
- Session timeout management

## API Reference

### AuthService

**Methods:**
- `loginWithGoogle(): Promise<void>` - Initiates Google OAuth2 login
- `logout(reason?: string): Promise<void>` - Logs out current user
- `isAuthenticated(): boolean` - Check if user is authenticated
- `getCurrentUser(): User | null` - Get current user data
- `getAuthState(): AuthState` - Get full authentication state
- `updateActivity(): void` - Update user activity timestamp

**Events:**
- `auth:login` - User successfully logged in
- `auth:logout` - User logged out
- `auth:error` - Authentication error occurred
- `auth:token_refresh` - Token refresh completed
- `auth:session_expired` - User session expired

### AuthComponent

**Configuration:**
```typescript
interface AuthComponentConfig {
  position: { x: number; y: number };
  width: number;
  height: number;
  showUserInfo?: boolean;
  showLogoutButton?: boolean;
  showLoginStreak?: boolean;
  avatarSize?: number;
}
```

### UserProfileComponent

**Configuration:**
```typescript
interface UserProfileConfig {
  position: { x: number; y: number };
  width: number;
  height: number;
  showStatistics?: boolean;
  showSettings?: boolean;
  showAchievements?: boolean;
  closable?: boolean;
}
```

## Development Tools

The authentication system includes development tools accessible via `window.devTools`:

```javascript
// Authentication tools
window.devTools.getAuthState()     // Get current auth state
window.devTools.getCurrentUser()    // Get current user
window.devTools.login()            // Initiate login
window.devTools.logout()           // Logout user
window.devTools.isAuth()           // Check authentication status
```

## Troubleshooting

### Common Issues

1. **Popup blocked by browser**
   - Ensure popups are allowed for your domain
   - Check browser popup blocker settings

2. **Redirect URI mismatch**
   - Verify redirect URI matches exactly in Google Console
   - Check for trailing slashes

3. **CORS issues**
   - Ensure your domain is in authorized JavaScript origins
   - Check HTTPS requirements for production

4. **Token refresh failures**
   - Check client secret configuration
   - Verify offline access is enabled

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=auth
```

Or check browser console for detailed authentication logs.

## Security Considerations

1. Never expose client secret in frontend code
2. Use HTTPS in production
3. Validate all OAuth parameters
4. Implement proper session timeout
5. Monitor for suspicious authentication attempts

## Production Deployment

1. Update redirect URIs to production domain
2. Configure proper CSP headers
3. Enable HTTPS
4. Set up monitoring for authentication failures
5. Configure proper logging and analytics

## Support

For issues related to:
- Google OAuth2 setup: Check Google Cloud Console documentation
- Game-specific authentication: Create an issue in the project repository
- Security concerns: Report through appropriate security channels