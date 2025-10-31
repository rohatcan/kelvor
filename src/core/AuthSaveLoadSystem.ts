/**
 * Enhanced SaveLoadSystem with Authentication and Cloud Sync
 * Handles save/load operations with user authentication and cloud synchronization
 */
import { eventSystem } from './EventSystem';
import { SaveLoadSystem, type SaveLoadOptions } from './SaveLoadSystem';
import {
  GameState,
  User,
  UserSaveData,
  CloudSaveData,
  AUTH_CONSTANTS,
} from '@/types';

export interface AuthSaveLoadOptions extends SaveLoadOptions {
  cloudSync?: boolean;
  cloudStorageUrl?: string;
  autoCloudBackup?: boolean;
  encryptionEnabled?: boolean;
}

export interface CloudSyncResult {
  success: boolean;
  saveId?: string;
  error?: string;
  timestamp: number;
}

export class AuthSaveLoadSystem extends SaveLoadSystem {
  private static readonly CLOUD_SAVE_KEY_PREFIX = 'kelvor_cloud_save_';
  private static readonly USER_SAVE_KEY_PREFIX = 'kelvor_user_save_';

  private user: User | null = null;
  private cloudSyncEnabled: boolean = false;
  private cloudStorageUrl?: string;
  private autoCloudBackup: boolean = false;

  constructor(options: AuthSaveLoadOptions = {}) {
    super(options);
    this.cloudSyncEnabled = options.cloudSync || false;
    this.cloudStorageUrl = options.cloudStorageUrl;
    this.autoCloudBackup = options.autoCloudBackup || false;

    // Listen for authentication events
    this.setupAuthListeners();
  }

  /**
   * Setup authentication event listeners
   */
  private setupAuthListeners(): void {
    eventSystem.onGameEvent('auth:login', async (event) => {
      this.user = event.payload.user;
      await this.handleUserLogin(event.payload.user);
    });

    eventSystem.onGameEvent('auth:logout', () => {
      this.handleUserLogout();
    });

    eventSystem.onGameEvent('auth:user_updated', (event) => {
      this.user = event.payload.user;
    });
  }

  /**
   * Handle user login
   */
  private async handleUserLogin(user: User): Promise<void> {
    console.log(`User logged in: ${user.email}`);

    if (this.cloudSyncEnabled) {
      // Attempt to sync with cloud saves
      await this.syncCloudSaves();
    }

    // Switch to user-specific save keys
    this.updateSaveKeysForUser();
  }

  /**
   * Handle user logout
   */
  private handleUserLogout(): void {
    console.log('User logged out');
    this.user = null;

    // Clear user-specific saves
    this.clearUserSaves();

    // Reset to default save keys
    this.resetSaveKeys();
  }

  /**
   * Update save keys for authenticated user
   */
  private updateSaveKeysForUser(): void {
    if (!this.user) return;

    // Save keys will now be user-specific
    // This allows multiple users to have separate save games on the same device
  }

  /**
   * Reset save keys to default
   */
  private resetSaveKeys(): void {
    // Reset to default save keys
  }

  /**
   * Clear user-specific save data
   */
  private clearUserSaves(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(AuthSaveLoadSystem.USER_SAVE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Save game with user association
   */
  public override async saveGame(gameState: GameState): Promise<boolean> {
    try {
      // Save to local storage first
      const localSuccess = await super.saveGame(gameState);

      if (!localSuccess) {
        return false;
      }

      // If user is authenticated and cloud sync is enabled, save to cloud
      if (this.user && this.cloudSyncEnabled) {
        await this.saveToCloud(gameState);
      }

      // Create user-specific backup
      if (this.user) {
        await this.createUserSave(gameState);
      }

      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  /**
   * Load game with user association
   */
  public override async loadGame(): Promise<{ success: boolean; gameState?: GameState; validation?: any }> {
    try {
      // If user is authenticated, try to load user-specific save first
      if (this.user) {
        const userSaveResult = await this.loadUserSave();
        if (userSaveResult.success) {
          return userSaveResult;
        }
      }

      // Fallback to regular save loading
      return await super.loadGame();
    } catch (error) {
      console.error('Failed to load game:', error);
      return { success: false };
    }
  }

  /**
   * Create user-specific save
   */
  private async createUserSave(gameState: GameState): Promise<boolean> {
    if (!this.user) return false;

    try {
      const userSaveData: UserSaveData = {
        userId: this.user.id,
        saveId: `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gameState,
        metadata: {
          timestamp: Date.now(),
          playTime: gameState.totalPlayTime,
          checksum: await this.generateAuthChecksum(gameState),
          deviceId: this.getAuthDeviceId(),
          appVersion: __APP_VERSION__,
          isCloudSynced: this.cloudSyncEnabled,
          syncTimestamp: Date.now(),
        },
      };

      const saveKey = `${AuthSaveLoadSystem.USER_SAVE_KEY_PREFIX}${this.user.id}_latest`;
      localStorage.setItem(saveKey, JSON.stringify(userSaveData));

      console.log('User save created successfully');
      return true;
    } catch (error) {
      console.error('Failed to create user save:', error);
      return false;
    }
  }

  /**
   * Load user-specific save
   */
  private async loadUserSave(): Promise<{ success: boolean; gameState?: GameState; validation?: any }> {
    if (!this.user) return { success: false };

    try {
      const saveKey = `${AuthSaveLoadSystem.USER_SAVE_KEY_PREFIX}${this.user.id}_latest`;
      const saveDataString = localStorage.getItem(saveKey);

      if (!saveDataString) {
        console.log('No user save found');
        return { success: false };
      }

      const userSaveData = JSON.parse(saveDataString) as UserSaveData;

      // Validate save data
      const validation = this.validateAuthGameState(userSaveData.gameState);
      if (!validation.isValid) {
        console.error('User save validation failed:', validation.errors);
        return { success: false, validation };
      }

      console.log('User save loaded successfully');
      return {
        success: true,
        gameState: userSaveData.gameState,
        validation
      };
    } catch (error) {
      console.error('Failed to load user save:', error);
      return { success: false };
    }
  }

  /**
   * Save game to cloud
   */
  private async saveToCloud(gameState: GameState): Promise<CloudSyncResult> {
    if (!this.user || !this.cloudStorageUrl) {
      return { success: false, error: 'Not authenticated or cloud storage not configured', timestamp: Date.now() };
    }

    try {
      eventSystem.emitGameEvent('cloud_save:sync_started', { userId: this.user.id });

      // Create cloud save data
      const cloudSaveData: CloudSaveData = {
        id: `cloud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.user.id,
        saveData: JSON.stringify(gameState), // In production, this should be encrypted
        metadata: {
          timestamp: Date.now(),
          playTime: gameState.totalPlayTime,
          checksum: await this.generateAuthChecksum(gameState),
          deviceId: this.getAuthDeviceId(),
          appVersion: __APP_VERSION__,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
      };

      // In a real implementation, this would send data to your backend
      // For now, we'll simulate cloud storage with localStorage
      const cloudKey = `${AuthSaveLoadSystem.CLOUD_SAVE_KEY_PREFIX}${this.user.id}`;
      localStorage.setItem(cloudKey, JSON.stringify(cloudSaveData));

      // Update user statistics
      this.updateUserSaveStats();

      eventSystem.emitGameEvent('cloud_save:sync_completed', {
        success: true,
        saveId: cloudSaveData.id
      });

      console.log('Cloud save completed successfully');
      return {
        success: true,
        saveId: cloudSaveData.id,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Cloud save failed:', error);

      eventSystem.emitGameEvent('cloud_save:sync_failed', {
        error: (error as Error).message
      });

      return {
        success: false,
        error: (error as Error).message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Load game from cloud
   */
  private async loadFromCloud(): Promise<{ success: boolean; gameState?: GameState; error?: string }> {
    if (!this.user || !this.cloudStorageUrl) {
      return { success: false, error: 'Not authenticated or cloud storage not configured' };
    }

    try {
      eventSystem.emitGameEvent('cloud_save:sync_started', { userId: this.user.id });

      // In a real implementation, this would fetch from your backend
      // For now, we'll simulate with localStorage
      const cloudKey = `${AuthSaveLoadSystem.CLOUD_SAVE_KEY_PREFIX}${this.user.id}`;
      const cloudDataString = localStorage.getItem(cloudKey);

      if (!cloudDataString) {
        return { success: false, error: 'No cloud save found' };
      }

      const cloudSaveData = JSON.parse(cloudDataString) as CloudSaveData;
      const gameState = JSON.parse(cloudSaveData.saveData) as GameState;

      // Verify checksum
      const isValid = await this.verifyAuthChecksum(gameState, cloudSaveData.metadata.checksum);
      if (!isValid) {
        return { success: false, error: 'Cloud save data is corrupted' };
      }

      eventSystem.emitGameEvent('cloud_save:sync_completed', {
        success: true,
        saveId: cloudSaveData.id
      });

      console.log('Cloud save loaded successfully');
      return { success: true, gameState };
    } catch (error) {
      console.error('Cloud load failed:', error);

      eventSystem.emitGameEvent('cloud_save:sync_failed', {
        error: (error as Error).message
      });

      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Sync cloud saves
   */
  private async syncCloudSaves(): Promise<void> {
    if (!this.user || !this.cloudSyncEnabled) return;

    try {
      // Check if there's a cloud save
      const cloudSave = await this.loadFromCloud();

      if (cloudSave.success && cloudSave.gameState) {
        // Check if cloud save is newer than local save
        const localSaveInfo = this.getSaveInfo();

        if (!localSaveInfo || cloudSave.gameState.lastSaved > localSaveInfo.timestamp) {
          // Cloud save is newer, ask user if they want to sync
          const shouldSync = await this.promptCloudSync();

          if (shouldSync) {
            // Load cloud save
            const loadResult = await this.loadFromCloud();
            if (loadResult.success) {
              // Save cloud data locally
              await super.saveGame(loadResult.gameState!);

              eventSystem.emitUINotification({
                id: `cloud_sync_${Date.now()}`,
                type: 'success',
                title: 'Cloud Sync',
                message: 'Your game has been synced from the cloud.',
                timestamp: Date.now(),
              });
            }
          }
        }
      } else if (this.autoCloudBackup) {
        // No cloud save found, upload current local save
        const currentSaveString = localStorage.getItem('kelvor_savegame');
        if (currentSaveString) {
          const currentSaveData = JSON.parse(currentSaveString);
          await this.saveToCloud(currentSaveData.gameState);
        }
      }
    } catch (error) {
      console.error('Cloud sync failed:', error);
    }
  }

  /**
   * Prompt user for cloud sync
   */
  private async promptCloudSync(): Promise<boolean> {
    // In a real implementation, this would show a modal/dialog
    // For now, we'll return true to auto-sync
    return true;
  }

  /**
   * Update user save statistics
   */
  private updateUserSaveStats(): void {
    if (!this.user) return;

    const updatedUser: User = {
      ...this.user,
      statistics: {
        ...this.user.statistics,
        // Update any relevant statistics here
      },
    };

    // Store updated user data
    this.storeUser(updatedUser);
  }

  /**
   * Store updated user data
   */
  private storeUser(user: User): void {
    localStorage.setItem(AUTH_CONSTANTS.DEFAULT_AUTH_CONFIG.storage.userKey, JSON.stringify(user));
  }

  /**
   * Get cloud save information
   */
  public getCloudSaveInfo(): CloudSaveData | null {
    if (!this.user) return null;

    try {
      const cloudKey = `${AuthSaveLoadSystem.CLOUD_SAVE_KEY_PREFIX}${this.user.id}`;
      const cloudDataString = localStorage.getItem(cloudKey);

      if (!cloudDataString) return null;

      return JSON.parse(cloudDataString) as CloudSaveData;
    } catch (error) {
      console.error('Failed to get cloud save info:', error);
      return null;
    }
  }

  /**
   * Delete cloud save
   */
  public async deleteCloudSave(): Promise<boolean> {
    if (!this.user) return false;

    try {
      const cloudKey = `${AuthSaveLoadSystem.CLOUD_SAVE_KEY_PREFIX}${this.user.id}`;
      localStorage.removeItem(cloudKey);

      console.log('Cloud save deleted successfully');
      return true;
    } catch (error) {
      console.error('Failed to delete cloud save:', error);
      return false;
    }
  }

  /**
   * Enable/disable cloud sync
   */
  public setCloudSync(enabled: boolean): void {
    this.cloudSyncEnabled = enabled;

    if (enabled && this.user) {
      this.syncCloudSaves();
    }
  }

  /**
   * Check if cloud sync is available
   */
  public isCloudSyncAvailable(): boolean {
    return this.cloudSyncEnabled && this.user !== null && this.cloudStorageUrl !== undefined;
  }

  /**
   * Generate checksum for game state
   */
  private async generateAuthChecksum(gameState: GameState): Promise<string> {
    const stateString = JSON.stringify(gameState);
    let hash = 0;

    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Get or generate device ID
   */
  private getAuthDeviceId(): string {
    let deviceId = localStorage.getItem('kelvor_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('kelvor_device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Validate game state for user saves
   */
  private validateAuthGameState(gameState: GameState): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!gameState.player) {
      errors.push('Missing player data');
    }

    if (!gameState.gameStats) {
      warnings.push('Missing game statistics');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Verify checksum for game state
   */
  private async verifyAuthChecksum(gameState: GameState, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.generateAuthChecksum(gameState);
    return actualChecksum === expectedChecksum;
  }
}