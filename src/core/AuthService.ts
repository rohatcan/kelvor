/**
 * Google OAuth2 Authentication Service
 * Handles user authentication, token management, and user sessions
 */
import { EventEmitter } from 'events';
import {
  AuthState,
  AuthToken,
  User,
  AuthCredentials,
  GoogleUserInfo,
  AuthConfig,
  AuthError,
  UserSettings,
  UserStatistics,
  UserPrivacySettings,
  UserGameplaySettings,
  AUTH_CONSTANTS,
} from '@/types';

export class AuthService extends EventEmitter {
  private static instance: AuthService;
  private authState: AuthState;
  private config: AuthConfig;
  private tokenRefreshTimer?: NodeJS.Timeout;
  private sessionTimer?: NodeJS.Timeout;

  private constructor() {
    super();
    this.config = this.loadConfig();
    this.authState = this.initializeAuthState();
    this.setupTokenRefresh();
    this.setupSessionTimeout();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize authentication state
   */
  private initializeAuthState(): AuthState {
    const storedToken = this.getStoredToken();
    const storedUser = this.getStoredUser();

    return {
      isAuthenticated: !!(storedToken && storedUser),
      user: storedUser,
      token: storedToken,
      isLoading: false,
      error: null,
      lastActivity: Date.now(),
    };
  }

  /**
   * Load authentication configuration
   */
  private loadConfig(): AuthConfig {
    return {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || AUTH_CONSTANTS.DEFAULT_AUTH_CONFIG.google.clientId,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: AUTH_CONSTANTS.DEFAULT_AUTH_CONFIG.google.redirectUri,
        scope: [...AUTH_CONSTANTS.DEFAULT_AUTH_CONFIG.google.scope],
        hostedDomain: process.env.GOOGLE_HOSTED_DOMAIN,
      },
      storage: AUTH_CONSTANTS.DEFAULT_AUTH_CONFIG.storage,
      session: AUTH_CONSTANTS.DEFAULT_AUTH_CONFIG.session,
    };
  }

  /**
   * Start Google OAuth2 flow
   */
  public async loginWithGoogle(): Promise<void> {
    try {
      this.setLoading(true);
      this.clearError();

      const authUrl = this.buildGoogleAuthUrl();

      // Store state for security
      const state = this.generateSecureState();
      this.storeAuthState(state);

      // Open Google OAuth in popup
      const popup = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open authentication window. Please enable popups.');
      }

      // Listen for popup close
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          this.setLoading(false);
        }
      }, 1000);

      // Handle OAuth callback
      await this.handleOAuthCallback(popup);

    } catch (error) {
      this.handleError(error as AuthError);
    }
  }

  /**
   * Build Google OAuth2 authorization URL
   */
  private buildGoogleAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.google.clientId,
      redirect_uri: this.config.google.redirectUri,
      response_type: AUTH_CONSTANTS.OAUTH_CONFIG.response_type,
      scope: this.config.google.scope.join(' '),
      access_type: AUTH_CONSTANTS.OAUTH_CONFIG.access_type,
      prompt: AUTH_CONSTANTS.OAUTH_CONFIG.prompt,
      state: this.generateSecureState(),
    });

    if (this.config.google.hostedDomain) {
      params.append('hd', this.config.google.hostedDomain);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Handle OAuth2 callback from popup
   */
  private async handleOAuthCallback(popup: Window): Promise<void> {
    return new Promise((resolve, reject) => {
      const messageHandler = async (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data.type === 'OAUTH_CALLBACK') {
          window.removeEventListener('message', messageHandler);
          popup.close();

          try {
            if (event.data.error) {
              throw new Error(event.data.error);
            }

            const { code, state } = event.data;

            // Verify state for security
            const storedState = this.getStoredAuthState();
            if (!storedState || state !== storedState) {
              throw new Error('Invalid state parameter. Security check failed.');
            }

            // Exchange authorization code for tokens
            await this.exchangeCodeForTokens(code);

            resolve();
          } catch (error) {
            reject(error);
          } finally {
            this.setLoading(false);
            this.clearAuthState();
          }
        }
      };

      window.addEventListener('message', messageHandler);
    });
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<void> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.google.clientId,
          client_secret: this.config.google.clientSecret || '',
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.google.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokenData = await response.json();

      // Get user info
      const userInfo = await this.getUserInfo(tokenData.access_token);

      // Create user record
      const user = this.createOrUpdateUser(userInfo, tokenData);

      // Update auth state
      const token: AuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        tokenType: tokenData.token_type,
        scope: tokenData.scope.split(' '),
      };

      this.updateAuthState({
        isAuthenticated: true,
        user,
        token,
        isLoading: false,
        error: null,
        lastActivity: Date.now(),
      });

      // Store tokens and user data
      this.storeToken(token);
      this.storeUser(user);

      // Emit login event
      this.emit('auth:login', { user, isNewUser: user.createdAt === Date.now() });

    } catch (error) {
      throw new Error(`Token exchange failed: ${error}`);
    }
  }

  /**
   * Get user information from Google
   */
  private async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create or update user from Google info
   */
  private createOrUpdateUser(googleInfo: GoogleUserInfo, tokenData: any): User {
    const existingUser = this.getStoredUser();
    const now = Date.now();

    if (existingUser && existingUser.email === googleInfo.email) {
      // Update existing user
      const updatedUser: User = {
        ...existingUser,
        name: googleInfo.name,
        avatar: googleInfo.picture,
        lastLoginAt: now,
        statistics: {
          ...existingUser.statistics,
          loginStreak: this.calculateLoginStreak(existingUser.statistics.lastLoginDate),
          lastLoginDate: now,
        },
      };

      return updatedUser;
    } else {
      // Create new user
      const newUser: User = {
        id: googleInfo.id,
        email: googleInfo.email,
        name: googleInfo.name,
        avatar: googleInfo.picture,
        provider: 'google',
        isGuest: false,
        createdAt: now,
        lastLoginAt: now,
        settings: this.createDefaultUserSettings(),
        achievements: [],
        statistics: {
          totalPlayTime: 0,
          sessionsPlayed: 1,
          longestSession: 0,
          achievementsUnlocked: 0,
          totalExperienceGained: 0,
          totalGoldEarned: 0,
          totalActionsCompleted: 0,
          loginStreak: 1,
          lastLoginDate: now,
        },
      };

      return newUser;
    }
  }

  /**
   * Create default user settings
   */
  private createDefaultUserSettings(): UserSettings {
    return {
      soundEnabled: true,
      musicEnabled: true,
      notifications: true,
      showAnimations: true,
      privacy: {
        profileVisible: true,
        achievementsVisible: true,
        statisticsVisible: false,
        allowFriendRequests: false,
      },
      gameplay: {
        autoSaveEnabled: true,
        autoSaveInterval: 30000,
        showTooltips: true,
        confirmDangerousActions: true,
      },
    };
  }

  /**
   * Calculate login streak
   */
  private calculateLoginStreak(lastLoginDate: number): number {
    const now = Date.now();
    const daysSinceLastLogin = Math.floor((now - lastLoginDate) / (1000 * 60 * 60 * 24));

    if (daysSinceLastLogin === 0) {
      // Same day, keep current streak
      return this.authState.user?.statistics.loginStreak || 1;
    } else if (daysSinceLastLogin === 1) {
      // Next day, increment streak
      return (this.authState.user?.statistics.loginStreak || 0) + 1;
    } else {
      // More than one day, reset streak
      return 1;
    }
  }

  /**
   * Logout user
   */
  public async logout(reason?: string): Promise<void> {
    try {
      // Revoke token if available
      if (this.authState.token?.accessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${this.authState.token.accessToken}`);
        } catch (error) {
          console.warn('Failed to revoke token:', error);
        }
      }

      // Clear stored data
      this.clearStoredAuthData();

      // Reset auth state
      this.authState = {
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
        lastActivity: Date.now(),
      };

      // Clear timers
      if (this.tokenRefreshTimer) {
        clearTimeout(this.tokenRefreshTimer);
      }
      if (this.sessionTimer) {
        clearTimeout(this.sessionTimer);
      }

      // Emit logout event
      this.emit('auth:logout', { reason: reason || 'user_initiated' });

    } catch (error) {
      console.error('Logout error:', error);
      this.handleError({
        code: 'UNKNOWN',
        message: 'Logout failed',
        details: error,
      });
    }
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<void> {
    if (!this.authState.token?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.google.clientId,
          client_secret: this.config.google.clientSecret || '',
          refresh_token: this.authState.token.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokenData = await response.json();

      const newToken: AuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || this.authState.token.refreshToken,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        tokenType: tokenData.token_type,
        scope: tokenData.scope ? tokenData.scope.split(' ') : this.authState.token.scope,
      };

      this.updateAuthState({
        ...this.authState,
        token: newToken,
        lastActivity: Date.now(),
      });

      this.storeToken(newToken);
      this.setupTokenRefresh();

      this.emit('auth:token_refresh', { success: true });

    } catch (error) {
      console.error('Token refresh failed:', error);
      this.emit('auth:token_refresh', { success: false });

      // If refresh fails, logout the user
      await this.logout('token_refresh_failed');
    }
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    if (!this.authState.token) {
      return;
    }

    const timeUntilExpiry = this.authState.token.expiresAt - Date.now();
    const refreshThreshold = this.config.session.refreshThreshold;

    if (timeUntilExpiry <= refreshThreshold) {
      // Token expires soon, refresh now
      this.refreshToken();
    } else {
      // Schedule refresh
      this.tokenRefreshTimer = setTimeout(() => {
        this.refreshToken();
      }, timeUntilExpiry - refreshThreshold);
    }
  }

  /**
   * Setup session timeout
   */
  private setupSessionTimeout(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    const maxInactivity = this.config.session.maxInactivity;
    const timeUntilTimeout = this.authState.lastActivity + maxInactivity - Date.now();

    if (timeUntilTimeout <= 0) {
      // Session expired
      this.logout('session_expired');
    } else {
      // Schedule timeout
      this.sessionTimer = setTimeout(() => {
        this.logout('session_expired');
        this.emit('auth:session_expired', { reason: 'Inactivity timeout' });
      }, timeUntilTimeout);
    }
  }

  /**
   * Update user activity
   */
  public updateActivity(): void {
    this.authState.lastActivity = Date.now();
    this.setupSessionTimeout();
  }

  /**
   * Get current auth state
   */
  public getAuthState(): Readonly<AuthState> {
    return { ...this.authState };
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.authState.user;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated && this.authState.token !== null;
  }

  /**
   * Get access token
   */
  public getAccessToken(): string | null {
    return this.authState.token?.accessToken || null;
  }

  // Storage methods
  private storeToken(token: AuthToken): void {
    localStorage.setItem(this.config.storage.tokenKey, JSON.stringify(token));
  }

  private getStoredToken(): AuthToken | null {
    try {
      const tokenString = localStorage.getItem(this.config.storage.tokenKey);
      if (!tokenString) return null;

      const token = JSON.parse(tokenString) as AuthToken;

      // Check if token is expired
      if (token.expiresAt <= Date.now()) {
        localStorage.removeItem(this.config.storage.tokenKey);
        return null;
      }

      return token;
    } catch (error) {
      console.error('Failed to parse stored token:', error);
      localStorage.removeItem(this.config.storage.tokenKey);
      return null;
    }
  }

  private storeUser(user: User): void {
    localStorage.setItem(this.config.storage.userKey, JSON.stringify(user));
  }

  private getStoredUser(): User | null {
    try {
      const userString = localStorage.getItem(this.config.storage.userKey);
      return userString ? JSON.parse(userString) as User : null;
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      localStorage.removeItem(this.config.storage.userKey);
      return null;
    }
  }

  private clearStoredAuthData(): void {
    localStorage.removeItem(this.config.storage.tokenKey);
    localStorage.removeItem(this.config.storage.userKey);
    this.clearAuthState();
  }

  // State management methods
  private updateAuthState(newState: Partial<AuthState>): void {
    this.authState = { ...this.authState, ...newState };
  }

  private setLoading(isLoading: boolean): void {
    this.authState.isLoading = isLoading;
  }

  private setError(error: AuthError | null): void {
    this.authState.error = error?.message || null;
    if (error) {
      this.emit('auth:error', { error });
    }
  }

  private clearError(): void {
    this.authState.error = null;
  }

  private handleError(error: AuthError): void {
    this.setError(error);
    this.setLoading(false);
  }

  // Security methods
  private generateSecureState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private storeAuthState(state: string): void {
    sessionStorage.setItem(this.config.storage.authStateKey, state);
  }

  private getStoredAuthState(): string | null {
    return sessionStorage.getItem(this.config.storage.authStateKey);
  }

  private clearAuthState(): void {
    sessionStorage.removeItem(this.config.storage.authStateKey);
  }

  /**
   * Cleanup method
   */
  public destroy(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    this.removeAllListeners();
  }
}

// Export singleton instance for easy access
export const authService = AuthService.getInstance();