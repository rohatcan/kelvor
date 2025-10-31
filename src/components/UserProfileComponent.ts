/**
 * User Profile Component
 * Displays detailed user information and statistics
 */
import { Scene } from 'phaser';
import { authService } from '@/core/AuthService';
import { User } from '@/types';

export interface UserProfileConfig {
  position: { x: number; y: number };
  width: number;
  height: number;
  showStatistics?: boolean;
  showSettings?: boolean;
  showAchievements?: boolean;
  closable?: boolean;
}

export class UserProfileComponent {
  private scene: Scene;
  private config: UserProfileConfig;
  private container: Phaser.GameObjects.Container;
  private isVisible: boolean = false;
  private user: User | null = null;

  // UI elements
  private background?: Phaser.GameObjects.Rectangle;
  private border?: Phaser.GameObjects.Graphics;
  private avatar?: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  private userName?: Phaser.GameObjects.Text;
  private userEmail?: Phaser.GameObjects.Text;
  private memberSince?: Phaser.GameObjects.Text;
  private closeButton?: Phaser.GameObjects.Text;
  private statisticsContainer?: Phaser.GameObjects.Container;
  private settingsContainer?: Phaser.GameObjects.Container;
  private achievementsContainer?: Phaser.GameObjects.Container;
  private tabs?: Phaser.GameObjects.Container;

  // Tab management
  private activeTab: 'statistics' | 'settings' | 'achievements' = 'statistics';

  constructor(scene: Scene, config: UserProfileConfig) {
    this.scene = scene;
    this.config = {
      showStatistics: true,
      showSettings: true,
      showAchievements: true,
      closable: true,
      ...config,
    };

    this.container = scene.add.container(config.position.x, config.position.y);
    this.container.setVisible(false);

    this.setupAuthListeners();
    this.createUI();

    // Update activity when user interacts with profile
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
    authService.on('auth:login', (event) => {
      this.user = event.payload.user;
      if (this.isVisible) {
        this.updateUI();
      }
    });

    authService.on('auth:logout', () => {
      this.user = null;
      this.hide();
    });

    authService.on('auth:user_updated', (event) => {
      this.user = event.payload.user;
      if (this.isVisible) {
        this.updateUI();
      }
    });
  }

  /**
   * Create UI elements
   */
  private createUI(): void {
    const { width, height } = this.config;

    // Create background
    this.background = this.scene.add.rectangle(0, 0, width, height, 0x1a1a2e, 0.95);
    this.background.setOrigin(0, 0);
    this.container.add(this.background);

    // Create border
    this.border = this.scene.add.graphics();
    this.border.lineStyle(3, 0x16213e, 1);
    this.border.strokeRoundedRect(0, 0, width, height, 15);
    this.container.add(this.border);

    // Create header
    this.createHeader();

    // Create close button
    if (this.config.closable) {
      this.closeButton = this.scene.add.text(width - 30, 20, '✕', {
        fontSize: '24px',
        color: '#e74c3c',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      this.closeButton.on('pointerdown', () => this.hide());
      this.closeButton.on('pointerover', () => {
        this.closeButton!.setStyle({ color: '#c0392b' });
      });
      this.closeButton.on('pointerout', () => {
        this.closeButton!.setStyle({ color: '#e74c3c' });
      });

      this.container.add(this.closeButton);
    }

    // Create tabs
    this.createTabs();

    // Create content areas
    this.createStatisticsTab();
    if (this.config.showSettings) {
      this.createSettingsTab();
    }
    if (this.config.showAchievements) {
      this.createAchievementsTab();
    }

    // Show statistics tab by default
    this.showTab('statistics');
  }

  /**
   * Create header section
   */
  private createHeader(): void {
    const { width } = this.config;

    // Header background
    const headerBg = this.scene.add.rectangle(0, 0, width, 120, 0x16213e, 0.8);
    headerBg.setOrigin(0, 0);
    this.container.add(headerBg);

    // Avatar (will be updated when user data is available)
    this.avatar = this.scene.add.circle(60, 60, 35, 0x3498db);
    this.container.add(this.avatar);

    // User info
    this.userName = this.scene.add.text(110, 45, 'Guest User', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0, 0.5);
    this.container.add(this.userName);

    this.userEmail = this.scene.add.text(110, 75, 'Not logged in', {
      fontSize: '14px',
      color: '#bdc3c7',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0, 0.5);
    this.container.add(this.userEmail);

    this.memberSince = this.scene.add.text(110, 95, '', {
      fontSize: '12px',
      color: '#7f8c8d',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0, 0.5);
    this.container.add(this.memberSince);
  }

  /**
   * Create tab navigation
   */
  private createTabs(): void {
    const { width } = this.config;
    const tabY = 130;

    this.tabs = this.scene.add.container(0, tabY);

    const tabConfig = [
      { id: 'statistics', label: 'Statistics', x: 30 },
      ...(this.config.showSettings ? [{ id: 'settings', label: 'Settings', x: 150 }] : []),
      ...(this.config.showAchievements ? [{ id: 'achievements', label: 'Achievements', x: 270 }] : []),
    ];

    tabConfig.forEach((tab) => {
      const tabText = this.scene.add.text(tab.x, 0, tab.label, {
        fontSize: '16px',
        color: '#7f8c8d',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });

      tabText.on('pointerdown', () => this.showTab(tab.id as any));
      tabText.on('pointerover', () => {
        if (this.activeTab !== tab.id) {
          tabText.setStyle({ color: '#3498db' });
        }
      });
      tabText.on('pointerout', () => {
        if (this.activeTab !== tab.id) {
          tabText.setStyle({ color: '#7f8c8d' });
        }
      });

      // Store reference for active state management
      (tabText as any).tabId = tab.id;
      this.tabs!.add(tabText);
    });

    this.container.add(this.tabs);
  }

  /**
   * Create statistics tab
   */
  private createStatisticsTab(): void {
    const { width } = this.config;
    const startY = 180;

    this.statisticsContainer = this.scene.add.container(0, startY);

    const stats = [
      { label: 'Total Play Time', key: 'totalPlayTime', formatter: this.formatPlayTime },
      { label: 'Sessions Played', key: 'sessionsPlayed', formatter: (v: number) => v.toString() },
      { label: 'Longest Session', key: 'longestSession', formatter: this.formatPlayTime },
      { label: 'Experience Gained', key: 'totalExperienceGained', formatter: this.formatNumber },
      { label: 'Gold Earned', key: 'totalGoldEarned', formatter: this.formatNumber },
      { label: 'Actions Completed', key: 'totalActionsCompleted', formatter: this.formatNumber },
      { label: 'Achievements', key: 'achievementsUnlocked', formatter: (v: number) => v.toString() },
      { label: 'Login Streak', key: 'loginStreak', formatter: (v: number) => `${v} days 🔥` },
    ];

    stats.forEach((stat, index) => {
      const y = index * 35;

      // Stat label
      const label = this.scene.add.text(30, y, stat.label + ':', {
        fontSize: '14px',
        color: '#bdc3c7',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0, 0.5);
      this.statisticsContainer.add(label);

      // Stat value
      const value = this.scene.add.text(width - 30, y, '0', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(1, 0.5);
      (value as any).formatter = stat.formatter;
      (value as any).statKey = stat.key;
      this.statisticsContainer.add(value);
    });

    this.container.add(this.statisticsContainer);
  }

  /**
   * Create settings tab
   */
  private createSettingsTab(): void {
    const { width } = this.config;
    const startY = 180;

    this.settingsContainer = this.scene.add.container(0, startY);
    this.settingsContainer.setVisible(false);

    const settings = [
      { label: 'Sound Effects', key: 'soundEnabled' },
      { label: 'Music', key: 'musicEnabled' },
      { label: 'Notifications', key: 'notifications' },
      { label: 'Show Animations', key: 'showAnimations' },
    ];

    settings.forEach((setting, index) => {
      const y = index * 40;

      // Setting label
      const label = this.scene.add.text(30, y, setting.label, {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0, 0.5);
      this.settingsContainer.add(label);

      // Toggle button
      const toggleBg = this.scene.add.rectangle(width - 80, y, 60, 25, 0x7f8c8d);
      toggleBg.setOrigin(0.5);
      this.settingsContainer.add(toggleBg);

      const toggleKnob = this.scene.add.circle(width - 95, y, 10, 0xFFFFFF);
      this.settingsContainer.add(toggleKnob);

      // Make toggle interactive
      const toggleContainer = this.scene.add.container(width - 80, y);
      toggleContainer.add([toggleBg, toggleKnob]);
      toggleContainer.setSize(60, 25);
      toggleContainer.setInteractive();

      (toggleContainer as any).settingKey = setting.key;
      (toggleContainer as any).toggleBg = toggleBg;
      (toggleContainer as any).toggleKnob = toggleKnob;

      toggleContainer.on('pointerdown', () => this.toggleSetting(toggleContainer as any));

      this.settingsContainer.add(toggleContainer);
    });

    this.container.add(this.settingsContainer);
  }

  /**
   * Create achievements tab
   */
  private createAchievementsTab(): void {
    const { width } = this.config;
    const startY = 180;

    this.achievementsContainer = this.scene.add.container(0, startY);
    this.achievementsContainer.setVisible(false);

    // Placeholder text for achievements
    const placeholder = this.scene.add.text(width / 2, 50, 'Coming Soon!', {
      fontSize: '18px',
      color: '#7f8c8d',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
    this.achievementsContainer.add(placeholder);

    this.container.add(this.achievementsContainer);
  }

  /**
   * Show specific tab
   */
  private showTab(tabId: 'statistics' | 'settings' | 'achievements'): void {
    this.activeTab = tabId;

    // Hide all tabs
    if (this.statisticsContainer) this.statisticsContainer.setVisible(false);
    if (this.settingsContainer) this.settingsContainer.setVisible(false);
    if (this.achievementsContainer) this.achievementsContainer.setVisible(false);

    // Show selected tab
    switch (tabId) {
      case 'statistics':
        if (this.statisticsContainer) this.statisticsContainer.setVisible(true);
        break;
      case 'settings':
        if (this.settingsContainer) this.settingsContainer.setVisible(true);
        break;
      case 'achievements':
        if (this.achievementsContainer) this.achievementsContainer.setVisible(true);
        break;
    }

    // Update tab colors
    if (this.tabs) {
      this.tabs.list.forEach((child: any) => {
        if (child.tabId) {
          if (child.tabId === tabId) {
            child.setStyle({ color: '#3498db', fontStyle: 'bold' });
          } else {
            child.setStyle({ color: '#7f8c8d', fontStyle: 'normal' });
          }
        }
      });
    }
  }

  /**
   * Toggle setting
   */
  private toggleSetting(toggleContainer: any): void {
    const settingKey = toggleContainer.settingKey;
    const { toggleBg, toggleKnob } = toggleContainer;

    if (!this.user) return;

    // Toggle the setting value
    const currentValue = (this.user.settings as any)[settingKey];
    const newValue = !currentValue;

    // Update user settings
    const updatedUser = {
      ...this.user,
      settings: {
        ...this.user.settings,
        [settingKey]: newValue,
      },
    };

    // Update auth service
    // This would typically be saved to a backend
    authService.emit('auth:user_updated', { user: updatedUser });

    // Animate the toggle
    const targetX = newValue ? -10 : 10;
    const targetColor = newValue ? 0x27ae60 : 0x7f8c8d;

    this.scene.tweens.add({
      targets: toggleKnob,
      x: targetX,
      duration: 200,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: toggleBg,
      fillColor: targetColor,
      duration: 200,
      ease: 'Power2',
    });
  }

  /**
   * Update UI with user data
   */
  private updateUI(): void {
    if (!this.user) {
      this.updateGuestUI();
      return;
    }

    // Update header
    this.updateHeader();

    // Update statistics
    this.updateStatistics();

    // Update settings
    this.updateSettings();
  }

  /**
   * Update UI for guest user
   */
  private updateGuestUI(): void {
    if (this.userName) {
      this.userName.setText('Guest User');
    }
    if (this.userEmail) {
      this.userEmail.setText('Not logged in');
    }
    if (this.memberSince) {
      this.memberSince.setText('');
    }
    if (this.avatar) {
      if (this.avatar instanceof Phaser.GameObjects.Arc) {
        this.avatar.fillColor = 0x95a5a6;
      }
    }
  }

  /**
   * Update header with user information
   */
  private updateHeader(): void {
    if (!this.user) return;

    if (this.userName) {
      this.userName.setText(this.user.name);
    }
    if (this.userEmail) {
      this.userEmail.setText(this.user.email);
    }
    if (this.memberSince) {
      const joinDate = new Date(this.user.createdAt).toLocaleDateString();
      this.memberSince.setText(`Member since ${joinDate}`);
    }

    // Update avatar
    if (this.user.avatar) {
      // Load user avatar image if available
      if (this.avatar) {
        this.avatar.destroy();
      }
      this.avatar = this.scene.add.image(60, 60, this.user.avatar);
      this.avatar.setDisplaySize(70, 70);
      this.container.add(this.avatar);
    } else if (this.avatar && this.avatar instanceof Phaser.GameObjects.Arc) {
      this.avatar.fillColor = 0x3498db;
    }
  }

  /**
   * Update statistics display
   */
  private updateStatistics(): void {
    if (!this.user || !this.statisticsContainer) return;

    this.statisticsContainer.list.forEach((child: any) => {
      if (child.statKey && child.formatter) {
        const value = (this.user.statistics as any)[child.statKey] || 0;
        child.setText(child.formatter(value));
      }
    });
  }

  /**
   * Update settings toggles
   */
  private updateSettings(): void {
    if (!this.user || !this.settingsContainer) return;

    this.settingsContainer.list.forEach((child: any) => {
      if (child.settingKey) {
        const isEnabled = (this.user.settings as any)[child.settingKey];
        const targetX = isEnabled ? -10 : 10;
        const targetColor = isEnabled ? 0x27ae60 : 0x7f8c8d;

        child.toggleKnob.x = targetX;
        child.toggleBg.fillColor = targetColor;
      }
    });
  }

  /**
   * Show the profile component
   */
  public show(): void {
    this.isVisible = true;
    this.container.setVisible(true);
    this.updateUI();
  }

  /**
   * Hide the profile component
   */
  public hide(): void {
    this.isVisible = false;
    this.container.setVisible(false);
  }

  /**
   * Toggle visibility
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if component is visible
   */
  public isComponentVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Format play time
   */
  private formatPlayTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Format large numbers
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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
   * Destroy component and clean up resources
   */
  public destroy(): void {
    // Remove event listeners
    authService.removeAllListeners('auth:login');
    authService.removeAllListeners('auth:logout');
    authService.removeAllListeners('auth:user_updated');

    // Destroy UI elements
    if (this.container) {
      this.container.destroy();
    }

    // Clear references
    this.background = undefined;
    this.border = undefined;
    this.avatar = undefined;
    this.userName = undefined;
    this.userEmail = undefined;
    this.memberSince = undefined;
    this.closeButton = undefined;
    this.statisticsContainer = undefined;
    this.settingsContainer = undefined;
    this.achievementsContainer = undefined;
    this.tabs = undefined;
  }
}