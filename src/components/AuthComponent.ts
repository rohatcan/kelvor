/**
 * Authentication UI Components
 * Handles login/logout UI with Google OAuth2 integration
 */
import { Scene } from 'phaser';
import { authService } from '@/core/AuthService';
import { eventSystem } from '@/core/EventSystem';
import { User, AuthState } from '@/types';

export interface AuthComponentConfig {
  position: { x: number; y: number };
  width: number;
  height: number;
  showUserInfo?: boolean;
  showLogoutButton?: boolean;
  showLoginStreak?: boolean;
  avatarSize?: number;
}

export class AuthComponent {
  private scene: Scene;
  private config: AuthComponentConfig;
  private container: Phaser.GameObjects.Container;
  private authState: AuthState;
  private isDestroyed: boolean = false;

  // UI elements
  private loginButton?: Phaser.GameObjects.Text;
  private logoutButton?: Phaser.GameObjects.Text;
  private userInfo?: Phaser.GameObjects.Container;
  private avatar?: Phaser.GameObjects.Image;
  private userName?: Phaser.GameObjects.Text;
  private userEmail?: Phaser.GameObjects.Text;
  private loginStreak?: Phaser.GameObjects.Text;
  private loadingSpinner?: Phaser.GameObjects.Container;
  private errorMessage?: Phaser.GameObjects.Text;

  constructor(scene: Scene, config: AuthComponentConfig) {
    this.scene = scene;
    this.config = {
      showUserInfo: true,
      showLogoutButton: true,
      showLoginStreak: true,
      avatarSize: 40,
      ...config,
    };

    this.authState = authService.getAuthState();
    this.container = scene.add.container(config.position.x, config.position.y);

    this.setupAuthListeners();
    this.createUI();
    this.updateUI();

    // Update activity when user interacts with auth component
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, config.width, config.height),
      Phaser.Geom.Rectangle.Contains
    );

    this.container.on('pointerdown', () => {
      authService.updateActivity();
    });
  }

  /**
   * Setup authentication event listeners
   */
  private setupAuthListeners(): void {
    // Listen for authentication state changes
    authService.on('auth:login', (event) => {
      this.authState = authService.getAuthState();
      this.updateUI();
      this.showLoginSuccess(event.payload.user);
    });

    authService.on('auth:logout', () => {
      this.authState = authService.getAuthState();
      this.updateUI();
      this.showLogoutSuccess();
    });

    authService.on('auth:error', (event) => {
      this.showError(event.payload.error.message);
    });

    authService.on('auth:token_refresh', (event) => {
      if (!event.payload.success) {
        this.showError('Session expired. Please login again.');
      }
    });

    authService.on('auth:session_expired', () => {
      this.showError('Session expired due to inactivity.');
    });

    // Listen for UI visibility changes
    eventSystem.onGameEvent('ui:notification', () => {
      // Hide any error messages when new notifications appear
      if (this.errorMessage) {
        this.errorMessage.setVisible(false);
      }
    });
  }

  /**
   * Create UI elements
   */
  private createUI(): void {
    const { width, height } = this.config;

    // Create background
    const background = this.scene.add.rectangle(0, 0, width, height, 0x2c3e50, 0.8);
    background.setOrigin(0, 0);
    this.container.add(background);

    // Create border
    const border = this.scene.add.graphics();
    border.lineStyle(2, 0x3498db, 1);
    border.strokeRoundedRect(0, 0, width, height, 10);
    this.container.add(border);

    // Create login button (hidden by default if user is authenticated)
    this.loginButton = this.scene.add.text(width / 2, height / 2, 'Login with Google', {
      fontSize: '16px',
      color: '#FFFFFF',
      backgroundColor: '#4285F4',
      padding: { x: 20, y: 10 },
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.loginButton.on('pointerdown', () => this.handleLogin());
    this.loginButton.on('pointerover', () => {
      this.loginButton!.setStyle({ backgroundColor: '#357ae8' });
    });
    this.loginButton.on('pointerout', () => {
      this.loginButton!.setStyle({ backgroundColor: '#4285F4' });
    });

    this.container.add(this.loginButton);

    // Create user info container (hidden by default if user is not authenticated)
    this.userInfo = this.scene.add.container(0, 0);
    this.container.add(this.userInfo);

    // Create logout button
    if (this.config.showLogoutButton) {
      this.logoutButton = this.scene.add.text(width - 60, 20, 'Logout', {
        fontSize: '14px',
        color: '#FFFFFF',
        backgroundColor: '#e74c3c',
        padding: { x: 10, y: 5 },
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      this.logoutButton.on('pointerdown', () => this.handleLogout());
      this.logoutButton.on('pointerover', () => {
        this.logoutButton!.setStyle({ backgroundColor: '#c0392b' });
      });
      this.logoutButton.on('pointerout', () => {
        this.logoutButton!.setStyle({ backgroundColor: '#e74c3c' });
      });

      this.userInfo.add(this.logoutButton);
    }

    // Create loading spinner
    this.createLoadingSpinner();

    // Create error message
    this.errorMessage = this.scene.add.text(width / 2, height - 30, '', {
      fontSize: '12px',
      color: '#e74c3c',
      wordWrap: { width: width - 20 },
      align: 'center',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5).setVisible(false);

    this.container.add(this.errorMessage);
  }

  /**
   * Create loading spinner
   */
  private createLoadingSpinner(): void {
    this.loadingSpinner = this.scene.add.container(this.config.width / 2, this.config.height / 2);

    // Create spinner circles
    const circles: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const circle = this.scene.add.circle(
        Math.cos(angle) * 15,
        Math.sin(angle) * 15,
        3,
        0x3498db
      );
      circles.push(circle);
      this.loadingSpinner.add(circle);
    }

    // Animate spinner
    this.scene.tweens.add({
      targets: this.loadingSpinner,
      angle: 360,
      duration: 1000,
      repeat: -1,
      ease: 'Linear',
    });

    // Animate circles
    circles.forEach((circle, index) => {
      this.scene.tweens.add({
        targets: circle,
        alpha: 0.2,
        duration: 400,
        repeat: -1,
        yoyo: true,
        delay: index * 50,
      });
    });

    this.loadingSpinner.setVisible(false);
    this.container.add(this.loadingSpinner);
  }

  /**
   * Update UI based on authentication state
   */
  private updateUI(): void {
    const isAuthenticated = this.authState.isAuthenticated;
    const isLoading = this.authState.isLoading;

    // Show/hide login button
    if (this.loginButton) {
      this.loginButton.setVisible(!isAuthenticated && !isLoading);
    }

    // Show/hide user info
    if (this.userInfo) {
      this.userInfo.setVisible(isAuthenticated);
    }

    // Show/hide loading spinner
    if (this.loadingSpinner) {
      this.loadingSpinner.setVisible(isLoading);
    }

    // Update user info if authenticated
    if (isAuthenticated && this.authState.user) {
      this.updateUserInfo(this.authState.user);
    }
  }

  /**
   * Update user information display
   */
  private updateUserInfo(user: User): void {
    // Clear existing user info
    this.userInfo!.removeAll(true);

    const { avatarSize, showUserInfo, showLoginStreak } = this.config;

    if (showUserInfo) {
      // Create avatar
      const size = avatarSize || 40;
      if (user.avatar) {
        this.avatar = this.scene.add.image(size / 2 + 10, this.config.height / 2, user.avatar);
        this.avatar.setDisplaySize(size, size);
        this.userInfo!.add(this.avatar);
      } else {
        // Create default avatar circle
        const avatarCircle = this.scene.add.circle(size / 2 + 10, this.config.height / 2, size / 2, 0x3498db);
        this.userInfo!.add(avatarCircle);

        // Add initials
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const initialsText = this.scene.add.text(size / 2 + 10, this.config.height / 2, initials, {
          fontSize: '16px',
          color: '#FFFFFF',
          fontFamily: 'Arial, sans-serif',
        }).setOrigin(0.5);
        this.userInfo!.add(initialsText);
      }

      // Create user name
      this.userName = this.scene.add.text(size + 30, this.config.height / 2 - 15, user.name, {
        fontSize: '16px',
        color: '#FFFFFF',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0, 0.5);
      this.userInfo!.add(this.userName);

      // Create user email
      this.userEmail = this.scene.add.text(size + 30, this.config.height / 2 + 5, user.email, {
        fontSize: '12px',
        color: '#bdc3c7',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0, 0.5);
      this.userInfo!.add(this.userEmail);

      // Create login streak
      if (showLoginStreak && user.statistics.loginStreak > 1) {
        this.loginStreak = this.scene.add.text(size + 30, this.config.height / 2 + 25,
          `🔥 ${user.statistics.loginStreak} day streak!`, {
          fontSize: '12px',
          color: '#f39c12',
          fontFamily: 'Arial, sans-serif',
        }).setOrigin(0, 0.5);
        this.userInfo!.add(this.loginStreak);
      }
    }

    // Add logout button back
    if (this.logoutButton) {
      this.userInfo!.add(this.logoutButton);
    }
  }

  /**
   * Handle login button click
   */
  private async handleLogin(): Promise<void> {
    try {
      this.hideError();
      await authService.loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      this.showError('Login failed. Please try again.');
    }
  }

  /**
   * Handle logout button click
   */
  private async handleLogout(): Promise<void> {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      this.showError('Logout failed. Please try again.');
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    if (this.errorMessage) {
      this.errorMessage.setText(message);
      this.errorMessage.setVisible(true);

      // Auto-hide after 5 seconds
      this.scene.time.delayedCall(5000, () => {
        if (this.errorMessage && !this.isDestroyed) {
          this.errorMessage.setVisible(false);
        }
      });
    }
  }

  /**
   * Hide error message
   */
  private hideError(): void {
    if (this.errorMessage) {
      this.errorMessage.setVisible(false);
    }
  }

  /**
   * Show login success notification
   */
  private showLoginSuccess(user: User): void {
    eventSystem.emitUINotification({
      id: `login_success_${Date.now()}`,
      type: 'success',
      title: 'Login Successful',
      message: `Welcome back, ${user.name}!`,
      timestamp: Date.now(),
    });
  }

  /**
   * Show logout success notification
   */
  private showLogoutSuccess(): void {
    eventSystem.emitUINotification({
      id: `logout_success_${Date.now()}`,
      type: 'info',
      title: 'Logged Out',
      message: 'You have been successfully logged out.',
      timestamp: Date.now(),
    });
  }

  /**
   * Get container for positioning
   */
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Update component position
   */
  public setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /**
   * Set component visibility
   */
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /**
   * Get component visibility
   */
  public getVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Destroy component and clean up resources
   */
  public destroy(): void {
    this.isDestroyed = true;

    // Remove event listeners
    authService.removeAllListeners('auth:login');
    authService.removeAllListeners('auth:logout');
    authService.removeAllListeners('auth:error');
    authService.removeAllListeners('auth:token_refresh');
    authService.removeAllListeners('auth:session_expired');

    // Destroy UI elements
    if (this.container) {
      this.container.destroy();
    }

    // Clear references
    this.loginButton = undefined;
    this.logoutButton = undefined;
    this.userInfo = undefined;
    this.avatar = undefined;
    this.userName = undefined;
    this.userEmail = undefined;
    this.loginStreak = undefined;
    this.loadingSpinner = undefined;
    this.errorMessage = undefined;
  }

  /**
   * Update component configuration
   */
  public updateConfig(newConfig: Partial<AuthComponentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updateUI();
  }

  /**
   * Get current auth state
   */
  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.authState.user;
  }
}