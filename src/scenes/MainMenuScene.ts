/**
 * Main menu scene - handles the main game menu with authentication
 */
import { Scene } from 'phaser';
import { AuthComponent } from '@/components/AuthComponent';
import { UserProfileComponent } from '@/components/UserProfileComponent';
import { authService } from '@/core/AuthService';

export class MainMenuScene extends Scene {
  private authComponent?: AuthComponent;
  private userProfileComponent?: UserProfileComponent;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  /**
   * Safely play audio with error handling
   */
  private playSoundSafely(soundKey: string): void {
    try {
      // Check if sound system exists and audio key is loaded
      if (this.sound && this.sound.get(soundKey)) {
        this.sound.play(soundKey);
      } else {
        // Silently skip audio if not available
        console.log(`Audio ${soundKey} not available, continuing without sound`);
      }
    } catch (error) {
      // Handle any unexpected audio errors gracefully
      console.warn(`Audio playback failed for ${soundKey}:`, error);
    }
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    this.add.image(width / 2, height / 2, 'background')
      .setDisplaySize(width, height);

    // Logo
    this.add.image(width / 2, height / 4, 'logo')
      .setOrigin(0.5);

    // Title
    this.add.text(width / 2, height / 2 - 100, 'Kelvor', {
      fontSize: '64px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 2 - 40, 'Idle RPG Adventure', {
      fontSize: '24px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Create authentication component
    this.createAuthComponent();

    // Play button
    const playButton = this.add.text(width / 2, height / 2 + 50, 'PLAY', {
      fontSize: '32px',
      color: '#FFFFFF',
      backgroundColor: '#4CAF50',
      padding: { x: 40, y: 20 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playButton.on('pointerdown', () => {
      this.playSoundSafely('click');
      this.startGame();
    });

    playButton.on('pointerover', () => {
      playButton.setStyle({ backgroundColor: '#45a049' });
    });

    playButton.on('pointerout', () => {
      playButton.setStyle({ backgroundColor: '#4CAF50' });
    });

    // Settings button
    const settingsButton = this.add.text(width / 2, height / 2 + 120, 'Settings', {
      fontSize: '24px',
      color: '#FFFFFF',
      backgroundColor: '#2196F3',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    settingsButton.on('pointerdown', () => {
      this.playSoundSafely('click');
      this.toggleUserProfile();
    });

    settingsButton.on('pointerover', () => {
      settingsButton.setStyle({ backgroundColor: '#1976D2' });
    });

    settingsButton.on('pointerout', () => {
      settingsButton.setStyle({ backgroundColor: '#2196F3' });
    });

    // User profile button (only show when authenticated)
    this.createProfileButton();

    // Version info
    this.add.text(10, height - 20, `v${__APP_VERSION__}`, {
      fontSize: '14px',
      color: '#CCCCCC',
    });

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Create authentication component
   */
  private createAuthComponent(): void {
    const { width } = this.cameras.main;

    this.authComponent = new AuthComponent(this, {
      position: { x: width - 320, y: 20 },
      width: 300,
      height: 120,
      showUserInfo: true,
      showLogoutButton: true,
      showLoginStreak: true,
      avatarSize: 40,
    });
  }

  /**
   * Create user profile button
   */
  private createProfileButton(): void {
    const { width, height } = this.cameras.main;

    const profileButton = this.add.text(width - 60, height - 40, 'Profile', {
      fontSize: '14px',
      color: '#FFFFFF',
      backgroundColor: '#9b59b6',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false); // Initially hidden

    profileButton.on('pointerdown', () => {
      this.playSoundSafely('click');
      this.toggleUserProfile();
    });

    profileButton.on('pointerover', () => {
      profileButton.setStyle({ backgroundColor: '#8e44ad' });
    });

    profileButton.on('pointerout', () => {
      profileButton.setStyle({ backgroundColor: '#9b59b6' });
    });

    // Store reference for visibility management
    (profileButton as any).isProfileButton = true;

    // Listen for auth events to show/hide profile button
    authService.on('auth:login', () => {
      profileButton.setVisible(true);
    });

    authService.on('auth:logout', () => {
      profileButton.setVisible(false);
    });
  }

  /**
   * Create user profile component
   */
  private createUserProfileComponent(): void {
    const { width, height } = this.cameras.main;

    this.userProfileComponent = new UserProfileComponent(this, {
      position: { x: (width - 400) / 2, y: (height - 500) / 2 },
      width: 400,
      height: 500,
      showStatistics: true,
      showSettings: true,
      showAchievements: true,
      closable: true,
    });
  }

  /**
   * Toggle user profile visibility
   */
  private toggleUserProfile(): void {
    if (!this.userProfileComponent) {
      this.createUserProfileComponent();
    }

    this.userProfileComponent!.toggle();
  }

  /**
   * Start the game
   */
  private startGame(): void {
    // Update activity before starting game
    authService.updateActivity();

    // Check if user is authenticated
    const authState = authService.getAuthState();

    if (!authState.isAuthenticated) {
      // Show a notification suggesting login
      this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
        'Login to save your progress!', {
        fontSize: '18px',
        color: '#f39c12',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setScrollFactor(0);

      // Auto-hide the message after 3 seconds
      this.time.delayedCall(3000, () => {
        // Start game anyway
        this.scene.start('GameScene');
      });
    } else {
      // User is authenticated, start game normally
      this.scene.start('GameScene');
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    // ESC to close profile
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.userProfileComponent && this.userProfileComponent.isComponentVisible()) {
        this.userProfileComponent.hide();
      }
    });

    // Ctrl/Cmd + L for login/logout
    this.input.keyboard.on('keydown-CTRL-L', () => {
      const authState = authService.getAuthState();
      if (authState.isAuthenticated) {
        authService.logout();
      } else {
        authService.loginWithGoogle();
      }
    });

    // Ctrl/Cmd + P for profile
    this.input.keyboard.on('keydown-CTRL-P', () => {
      const authState = authService.getAuthState();
      if (authState.isAuthenticated) {
        this.toggleUserProfile();
      }
    });
  }

  /**
   * Handle scene shutdown
   */
  shutdown(): void {
    // Cleanup components
    if (this.authComponent) {
      this.authComponent.destroy();
    }
    if (this.userProfileComponent) {
      this.userProfileComponent.destroy();
    }

    // Remove keyboard listeners
    this.input.keyboard.shutdown();
  }

  /**
   * Handle scene destroy
   */
  destroy(): void {
    this.shutdown();
  }
}