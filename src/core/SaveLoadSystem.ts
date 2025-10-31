/**
 * SaveLoadSystem - Handles game save/load operations with validation, backup, and migration support
 */
import { eventSystem } from './EventSystem';
import {
  GameState,
  SaveData,
  SaveMetadata,
  WoodcuttingSkill,
} from '@/types';

export interface SaveLoadOptions {
  autoBackup?: boolean;
  maxBackups?: number;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
  cloudSync?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  migratedVersion?: string;
}

export interface SaveInfo {
  version: string;
  timestamp: number;
  playTime: number;
  size: number;
  checksum: string;
  isValid: boolean;
}

export class SaveLoadSystem {
  private static readonly SAVE_KEY = 'kelvor_savegame';
  private static readonly BACKUP_KEY_PREFIX = 'kelvor_backup_';
  private static readonly MAX_BACKUPS = 5;
  private static readonly COMPRESSION_THRESHOLD = 1024 * 10; // 10KB

  private options: SaveLoadOptions;
  private migrations: Map<string, (saveData: any) => any> = new Map();

  constructor(options: SaveLoadOptions = {}) {
    this.options = {
      autoBackup: true,
      maxBackups: SaveLoadSystem.MAX_BACKUPS,
      compressionEnabled: true,
      encryptionEnabled: false,
      cloudSync: false,
      ...options,
    };

    this.registerMigrations();
  }

  /**
   * Register version migrations for save compatibility
   */
  private registerMigrations(): void {
    // Example migration from 0.1.0 to 0.2.0
    this.migrations.set('0.1.0->0.2.0', (saveData: any) => {
      // Add new fields that didn't exist in 0.1.0
      if (!saveData.gameState.woodcutting) {
        saveData.gameState.woodcutting = this.createDefaultWoodcuttingSkill();
      }
      return saveData;
    });

    // Add more migrations as needed
  }

  /**
   * Save the current game state
   */
  public async saveGame(gameState: GameState): Promise<boolean> {
    try {
      // Validate game state before saving
      const validation = this.validateGameState(gameState);
      if (!validation.isValid) {
        console.error('Cannot save invalid game state:', validation.errors);
        eventSystem.emitUINotification({
          id: `save_validation_error_${Date.now()}`,
          type: 'error',
          title: 'Save Failed',
          message: 'Game state validation failed. Please report this issue.',
          timestamp: Date.now(),
        });
        return false;
      }

      // Create backup if enabled
      if (this.options.autoBackup) {
        await this.createBackup(gameState);
      }

      // Create save data structure
      const saveData: SaveData = {
        version: __APP_VERSION__,
        gameState,
        metadata: await this.createSaveMetadata(gameState),
      };

      // Serialize and optionally compress
      let serializedData = JSON.stringify(saveData);

      if (this.options.compressionEnabled && serializedData.length > SaveLoadSystem.COMPRESSION_THRESHOLD) {
        serializedData = await this.compressData(serializedData);
      }

      // Save to localStorage
      localStorage.setItem(SaveLoadSystem.SAVE_KEY, serializedData);

      // Update last saved timestamp
      gameState.lastSaved = Date.now();

      // Emit save success event
      eventSystem.emitGameSaved(Date.now());

      // Clean up old backups
      if (this.options.autoBackup) {
        await this.cleanupOldBackups();
      }

      console.log('Game saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      eventSystem.emitUINotification({
        id: `save_error_${Date.now()}`,
        type: 'error',
        title: 'Save Failed',
        message: 'Unable to save game progress. Please check your browser storage.',
        timestamp: Date.now(),
      });
      return false;
    }
  }

  /**
   * Load game state from storage
   */
  public async loadGame(): Promise<{ success: boolean; gameState?: GameState; validation?: ValidationResult }> {
    try {
      const saveDataString = localStorage.getItem(SaveLoadSystem.SAVE_KEY);
      if (!saveDataString) {
        console.log('No save game found');
        return { success: false };
      }

      // Deserialize and optionally decompress
      let saveData: SaveData;
      try {
        const decompressedData = await this.decompressData(saveDataString);
        saveData = JSON.parse(decompressedData);
      } catch (parseError) {
        // Try direct JSON parse if decompression fails
        saveData = JSON.parse(saveDataString);
      }

      // Validate and migrate save data
      const validation = await this.validateAndMigrateSaveData(saveData);

      if (!validation.isValid) {
        console.error('Save data validation failed:', validation.errors);
        eventSystem.emitUINotification({
          id: `load_validation_error_${Date.now()}`,
          type: 'error',
          title: 'Load Failed',
          message: 'Save file is corrupted or incompatible.',
          timestamp: Date.now(),
        });
        return { success: false, validation };
      }

      // Show migration notice if applicable
      if (validation.migratedVersion) {
        eventSystem.emitUINotification({
          id: `migration_notice_${Date.now()}`,
          type: 'info',
          title: 'Save Updated',
          message: `Game save migrated from version ${validation.migratedVersion} to ${__APP_VERSION__}`,
          timestamp: Date.now(),
        });
      }

      // Emit load success event
      eventSystem.emitGameLoaded(Date.now());

      console.log('Game loaded successfully');
      return { success: true, gameState: saveData.gameState, validation };
    } catch (error) {
      console.error('Failed to load game:', error);
      eventSystem.emitUINotification({
        id: `load_error_${Date.now()}`,
        type: 'error',
        title: 'Load Failed',
        message: 'Unable to load game save. The file may be corrupted.',
        timestamp: Date.now(),
      });
      return { success: false };
    }
  }

  /**
   * Create a backup of the current save
   */
  public async createBackup(gameState: GameState): Promise<boolean> {
    try {
      const timestamp = Date.now();
      const backupKey = `${SaveLoadSystem.BACKUP_KEY_PREFIX}${timestamp}`;

      const backupData = {
        version: __APP_VERSION__,
        gameState,
        metadata: await this.createSaveMetadata(gameState),
        backupTimestamp: timestamp,
      };

      localStorage.setItem(backupKey, JSON.stringify(backupData));
      console.log(`Backup created: ${backupKey}`);
      return true;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return false;
    }
  }

  /**
   * Get list of available backups
   */
  public getAvailableBackups(): SaveInfo[] {
    const backups: SaveInfo[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SaveLoadSystem.BACKUP_KEY_PREFIX)) {
        try {
          const backupData = JSON.parse(localStorage.getItem(key) || '{}');
          backups.push({
            version: backupData.version,
            timestamp: backupData.backupTimestamp,
            playTime: backupData.metadata?.playTime || 0,
            size: key.length,
            checksum: backupData.metadata?.checksum || '',
            isValid: true,
          });
        } catch (error) {
          console.warn(`Invalid backup file: ${key}`);
        }
      }
    }

    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Restore from a backup
   */
  public async restoreFromBackup(backupTimestamp: number): Promise<boolean> {
    try {
      const backupKey = `${SaveLoadSystem.BACKUP_KEY_PREFIX}${backupTimestamp}`;
      const backupDataString = localStorage.getItem(backupKey);

      if (!backupDataString) {
        console.error('Backup not found:', backupTimestamp);
        return false;
      }

      const backupData = JSON.parse(backupDataString);

      // Validate backup data
      const validation = await this.validateAndMigrateSaveData(backupData);
      if (!validation.isValid) {
        console.error('Backup validation failed:', validation.errors);
        return false;
      }

      // Create backup of current save before restoring
      const currentSaveString = localStorage.getItem(SaveLoadSystem.SAVE_KEY);
      if (currentSaveString) {
        await this.createBackup(JSON.parse(currentSaveString).gameState);
      }

      // Restore the backup
      localStorage.setItem(SaveLoadSystem.SAVE_KEY, backupDataString);

      eventSystem.emitUINotification({
        id: `backup_restored_${Date.now()}`,
        type: 'success',
        title: 'Backup Restored',
        message: `Game restored from backup created ${new Date(backupTimestamp).toLocaleString()}`,
        timestamp: Date.now(),
      });

      console.log('Backup restored successfully');
      return true;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return false;
    }
  }

  /**
   * Clean up old backups
   */
  public async cleanupOldBackups(): Promise<void> {
    const backups = this.getAvailableBackups();
    const maxBackups = this.options.maxBackups || SaveLoadSystem.MAX_BACKUPS;

    if (backups.length > maxBackups) {
      const backupsToRemove = backups.slice(maxBackups);

      for (const backup of backupsToRemove) {
        const backupKey = `${SaveLoadSystem.BACKUP_KEY_PREFIX}${backup.timestamp}`;
        localStorage.removeItem(backupKey);
        console.log(`Removed old backup: ${backupKey}`);
      }
    }
  }

  /**
   * Delete all save data including backups
   */
  public deleteAllSaveData(): void {
    // Remove main save
    localStorage.removeItem(SaveLoadSystem.SAVE_KEY);

    // Remove all backups
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(SaveLoadSystem.BACKUP_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }

    console.log('All save data deleted');
  }

  /**
   * Get save information
   */
  public getSaveInfo(): SaveInfo | null {
    try {
      const saveDataString = localStorage.getItem(SaveLoadSystem.SAVE_KEY);
      if (!saveDataString) {
        return null;
      }

      const saveData = JSON.parse(saveDataString);
      return {
        version: saveData.version,
        timestamp: saveData.metadata?.timestamp || Date.now(),
        playTime: saveData.metadata?.playTime || 0,
        size: saveDataString.length,
        checksum: saveData.metadata?.checksum || '',
        isValid: true,
      };
    } catch (error) {
      console.warn('Failed to get save info:', error);
      return null;
    }
  }

  /**
   * Validate game state
   */
  private validateGameState(gameState: GameState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!gameState.player) {
      errors.push('Missing player data');
    } else {
      if (!gameState.player.id) errors.push('Missing player ID');
      if (!gameState.player.name) errors.push('Missing player name');
      if (gameState.player.level < 1 || gameState.player.level > 99) {
        errors.push('Invalid player level');
      }
      if (gameState.player.gold < 0) errors.push('Negative gold amount');
    }

    // Check skills
    if (!gameState.skills) {
      warnings.push('Missing skills data');
    }

    // Check woodcutting skill
    if (!gameState.woodcutting) {
      warnings.push('Missing woodcutting skill data');
    } else {
      if (gameState.woodcutting.level < 1 || gameState.woodcutting.level > 99) {
        errors.push('Invalid woodcutting level');
      }
      if (gameState.woodcutting.experience < 0) {
        errors.push('Negative woodcutting experience');
      }
    }

    // Check game stats
    if (!gameState.gameStats) {
      warnings.push('Missing game statistics');
    }

    // Check settings
    if (!gameState.settings) {
      warnings.push('Missing game settings');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate and migrate save data
   */
  private async validateAndMigrateSaveData(saveData: SaveData): Promise<ValidationResult> {
    let errors: string[] = [];
    let warnings: string[] = [];
    let migratedVersion: string | undefined;

    // Check basic structure
    if (!saveData.version) {
      errors.push('Missing save version');
    }

    if (!saveData.gameState) {
      errors.push('Missing game state');
      return { isValid: false, errors, warnings };
    }

    // Check version and apply migrations if needed
    if (saveData.version !== __APP_VERSION__) {
      const migrationResult = await this.applyMigrations(saveData);
      if (migrationResult.success) {
        migratedVersion = saveData.version;
        saveData = migrationResult.saveData;
        if (migrationResult.warnings.length > 0) {
          warnings.push(...migrationResult.warnings);
        }
      } else {
        errors.push(...migrationResult.errors);
      }
    }

    // Validate game state
    const gameStateValidation = this.validateGameState(saveData.gameState);
    errors.push(...gameStateValidation.errors);
    warnings.push(...gameStateValidation.warnings);

    // Verify checksum if present
    if (saveData.metadata?.checksum) {
      const calculatedChecksum = await this.generateChecksum(saveData.gameState);
      if (calculatedChecksum !== saveData.metadata.checksum) {
        errors.push('Save data checksum mismatch - file may be corrupted');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      migratedVersion,
    };
  }

  /**
   * Apply version migrations
   */
  private async applyMigrations(saveData: SaveData): Promise<{
    success: boolean;
    saveData: SaveData;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const currentVersion = saveData.version;

    // Apply migrations in order
    const migrationKeys = Array.from(this.migrations.keys()).sort();

    for (const migrationKey of migrationKeys) {
      const [fromVersion] = migrationKey.split('->');

      if (currentVersion && fromVersion && this.compareVersions(currentVersion, fromVersion) <= 0) {
        try {
          const migration = this.migrations.get(migrationKey);
          if (migration) {
            saveData = migration(saveData);
            warnings.push(`Applied migration: ${migrationKey}`);
          }
        } catch (error) {
          errors.push(`Migration failed: ${migrationKey}`);
        }
      }
    }

    // Update version
    saveData.version = __APP_VERSION__;

    return {
      success: errors.length === 0,
      saveData,
      errors,
      warnings,
    };
  }

  /**
   * Compare version strings
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }

  /**
   * Create save metadata
   */
  private async createSaveMetadata(gameState: GameState): Promise<SaveMetadata> {
    return {
      timestamp: Date.now(),
      playTime: gameState.totalPlayTime,
      checksum: await this.generateChecksum(gameState),
      deviceId: this.getDeviceId(),
      appVersion: __APP_VERSION__,
    };
  }

  /**
   * Generate checksum for game state
   */
  private async generateChecksum(gameState: GameState): Promise<string> {
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
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('kelvor_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('kelvor_device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Simple compression for large save files
   */
  private async compressData(data: string): Promise<string> {
    // Simple compression - in a real implementation, you might use a compression library
    // For now, just return the data as-is
    return data;
  }

  /**
   * Simple decompression for save files
   */
  private async decompressData(data: string): Promise<string> {
    // Simple decompression - in a real implementation, you might use a compression library
    // For now, just return the data as-is
    return data;
  }

  /**
   * Create default woodcutting skill for migration
   */
  private createDefaultWoodcuttingSkill(): WoodcuttingSkill {
    return {
      id: 'woodcutting',
      name: 'Woodcutting',
      level: 1,
      experience: 0,
      experienceToNext: 100,
      totalLogsChopped: 0,
      treesUnlocked: [],
      toolsOwned: [],
    };
  }

  /**
   * Export save data to JSON file
   */
  public exportSave(): boolean {
    try {
      const saveDataString = localStorage.getItem(SaveLoadSystem.SAVE_KEY);
      if (!saveDataString) {
        console.error('No save data to export');
        return false;
      }

      const blob = new Blob([saveDataString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `kelvor_save_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      console.log('Save data exported successfully');
      return true;
    } catch (error) {
      console.error('Failed to export save data:', error);
      return false;
    }
  }

  /**
   * Import save data from JSON file
   */
  public async importSave(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const saveData = JSON.parse(text);

      // Validate the imported save
      const validation = await this.validateAndMigrateSaveData(saveData);
      if (!validation.isValid) {
        console.error('Imported save validation failed:', validation.errors);
        return false;
      }

      // Create backup of current save
      const currentSaveString = localStorage.getItem(SaveLoadSystem.SAVE_KEY);
      if (currentSaveString) {
        await this.createBackup(JSON.parse(currentSaveString).gameState);
      }

      // Import the save
      localStorage.setItem(SaveLoadSystem.SAVE_KEY, text);

      eventSystem.emitUINotification({
        id: `save_imported_${Date.now()}`,
        type: 'success',
        title: 'Save Imported',
        message: 'Game save has been imported successfully.',
        timestamp: Date.now(),
      });

      console.log('Save data imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import save data:', error);
      eventSystem.emitUINotification({
        id: `import_error_${Date.now()}`,
        type: 'error',
        title: 'Import Failed',
        message: 'Failed to import save file. Please check the file format.',
        timestamp: Date.now(),
      });
      return false;
    }
  }
}