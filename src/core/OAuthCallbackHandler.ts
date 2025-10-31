/**
 * OAuth2 Callback Handler
 * Handles OAuth2 callback from Google authentication
 */
import { authService } from './AuthService';

export class OAuthCallbackHandler {
  private static instance: OAuthCallbackHandler;

  private constructor() {
    this.setupCallbackListener();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): OAuthCallbackHandler {
    if (!OAuthCallbackHandler.instance) {
      OAuthCallbackHandler.instance = new OAuthCallbackHandler();
    }
    return OAuthCallbackHandler.instance;
  }

  /**
   * Setup callback listener for OAuth flow
   */
  private setupCallbackListener(): void {
    // Check if we're on the callback page
    if (this.isCallbackPage()) {
      this.handleCallback();
    }

    // Listen for messages from popup windows
    this.setupMessageListener();
  }

  /**
   * Check if current page is the OAuth callback
   */
  private isCallbackPage(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('code') || urlParams.has('error');
  }

  /**
   * Handle OAuth callback
   */
  private handleCallback(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    if (error) {
      this.sendCallbackMessage({ error, state });
    } else if (code) {
      this.sendCallbackMessage({ code, state });
    }

    // Close the popup window
    window.close();
  }

  /**
   * Send callback message to parent window
   */
  private sendCallbackMessage(data: { code?: string; error?: string; state?: string }): void {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'OAUTH_CALLBACK',
          ...data,
        }, window.location.origin);
      }
    } catch (error) {
      console.error('Failed to send callback message:', error);
    }
  }

  /**
   * Setup message listener for popup communication
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      // Handle different message types
      switch (event.data.type) {
        case 'AUTH_INITIATE':
          this.handleAuthInitiate(event.data);
          break;
        case 'AUTH_STATUS':
          this.handleAuthStatus(event.data);
          break;
        default:
          break;
      }
    });
  }

  /**
   * Handle authentication initiation
   */
  private handleAuthInitiate(data: any): void {
    // This can be used for additional auth flow handling
    console.log('Authentication initiated:', data);
  }

  /**
   * Handle authentication status request
   */
  private handleAuthStatus(data: any): void {
    const authState = authService.getAuthState();

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'AUTH_STATUS_RESPONSE',
        authState,
      }, window.location.origin);
    }
  }

  /**
   * Initialize callback handler on page load
   */
  public static initialize(): void {
    OAuthCallbackHandler.getInstance();
  }
}

// Auto-initialize when this module is imported
OAuthCallbackHandler.initialize();