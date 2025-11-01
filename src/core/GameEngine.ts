/**
 * Core GameEngine class - manages game state, game loop, and system coordination
 */
import { EventEmitter } from './EventEmitter';
import {
  GameState,
  Player,
  GameSettings,
  GameStats,
  SaveData,
  UIState,
  WoodcuttingSkill,
  GAME_CONSTANTS,
  DeepPartial,
  TypedGameEvent,
} from '@/types';
import { skillRegistry } from '@/systems/skills/SkillRegistry';
import { skillDataLoader } from '@/systems/skills/SkillDataLoader';

export class GameEngine extends EventEmitter {
  private gameState!: GameState;
  private uiState!: UIState;
  private isRunning: boolean = false;
  private lastUpdateTime: number = 0;
  private gameLoopInterval?: NodeJS.Timeout;
  private autoSaveInterval?: NodeJS.Timeout;
  private sessionStartTime: number = 0;
  private skillSystemInitialized: boolean = false;

  constructor() {
    super();
    this.initializeGameState();
    this.initializeUIState();
    this.setupEventHandlers();
    this.initializeSkillSystem();
  }

  /**
   * Initialize the game state with default values
   */
  private initializeGameState(): void {
    this.gameState = {
      player: this.createDefaultPlayer(),
      skills: {},
      woodcutting: this.createDefaultWoodcuttingSkill(),
      activeActions: [],
      completedActions: [],
      unlockedAreas: ['tutorial'],
      unlockedContent: [],
      gameStats: this.createDefaultGameStats(),
      settings: this.createDefaultSettings(),
      lastSaved: 0,
      totalPlayTime: 0,
    };
  }

  /**
   * Initialize UI state
   */
  private initializeUIState(): void {
    this.uiState = {
      currentScene: 'MainMenuScene',
      inventoryOpen: false,
      skillsOpen: false,
      settingsOpen: false,
      activePanels: [],
      tooltips: [],
      modals: [],
      notifications: [],
      hudState: {
        healthBarVisible: true,
        experienceBarVisible: true,
        minimapVisible: false,
        actionQueueVisible: true,
        notificationsVisible: true,
      },
    };
  }

  /**
   * Create default player data
   */
  public createDefaultPlayer(): Player {
    return {
      id: 'player-1',
      name: 'Adventurer',
      level: 1,
      experience: 0,
      experienceToNext: GAME_CONSTANTS.BASE_EXPERIENCE,
      health: 100,
      maxHealth: 100,
      position: { x: 400, y: 300 },
      stats: {
        attack: 1,
        defense: 1,
        strength: 1,
        hitpoints: 10,
        ranged: 1,
        prayer: 1,
        magic: 1,
        cooking: 1,
        woodcutting: 1,
        fishing: 1,
        mining: 1,
        smithing: 1,
        herblore: 1,
        agility: 1,
        thieving: 1,
        slayer: 1,
        farming: 1,
        runecrafting: 1,
        hunter: 1,
        construction: 1,
      },
      inventory: [],
      skills: [],
      gold: 100,
    };
  }

  /**
   * Create default woodcutting skill
   */
  public createDefaultWoodcuttingSkill(): WoodcuttingSkill {
    return {
      id: 'woodcutting',
      name: 'Woodcutting',
      level: 1,
      experience: 0,
      experienceToNext: GAME_CONSTANTS.BASE_EXPERIENCE,
      totalLogsChopped: 0,
      treesUnlocked: [],
      toolsOwned: [],
      // Initialize with a basic starting tool
      currentTool: {
        id: 'tool_bronze_hatchet',
        name: 'Bronze Hatchet',
        level: 1,
        speed: 1.0,
        effectiveness: 1.0,
        durability: 100,
        maxDurability: 100,
        icon: 'bronze_hatchet.png',
        description: 'A basic bronze hatchet for chopping trees.',
        buyPrice: 50,
        sellPrice: 15,
      }
    };
  }

  /**
   * Create default game statistics
   */
  private createDefaultGameStats(): GameStats {
    return {
      totalActionsCompleted: 0,
      totalExperienceGained: 0,
      totalGoldEarned: 0,
      totalItemsObtained: 0,
      sessionsPlayed: 0,
      longestSession: 0,
      achievementsUnlocked: [],
    };
  }

  /**
   * Create default game settings
   */
  private createDefaultSettings(): GameSettings {
    return {
      autoSave: true,
      autoSaveInterval: GAME_CONSTANTS.AUTO_SAVE_INTERVAL,
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.7,
      notifications: true,
      showAnimations: true,
      debugMode: false,
    };
  }

  /**
   * Set up event handlers for the game engine
   */
  private setupEventHandlers(): void {
    // Handle skill level ups
    this.on('skill:level_up', (event: TypedGameEvent<'skill:level_up'>) => {
      this.handleSkillLevelUp(event.payload.skillId, event.payload.newLevel);
    });

    // Handle action completions
    this.on('action:completed', (event: TypedGameEvent<'action:completed'>) => {
      this.handleActionCompletion(event.payload.actionId, event.payload.rewards);
    });

    // Handle player experience gained
    this.on('player:experience_gained', (event: TypedGameEvent<'player:experience_gained'>) => {
      this.handleExperienceGained(event.payload.skillId, event.payload.amount);
    });
  }

  /**
   * Start the game engine
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('Game engine is already running');
      return;
    }

    this.isRunning = true;
    this.sessionStartTime = Date.now();
    this.lastUpdateTime = Date.now();

    // Update session stats
    this.gameState.gameStats.sessionsPlayed++;

    // Start game loop
    this.startGameLoop();

    // Start auto-save if enabled
    if (this.gameState.settings.autoSave) {
      this.startAutoSave();
    }

    this.emit('game:started', { timestamp: Date.now() });
    console.log('Game engine started');
  }

  /**
   * Stop the game engine
   */
  public stop(): void {
    if (!this.isRunning) {
      console.warn('Game engine is not running');
      return;
    }

    this.isRunning = false;

    // Update session stats
    const sessionDuration = Date.now() - this.sessionStartTime;
    this.gameState.totalPlayTime += sessionDuration;

    if (sessionDuration > this.gameState.gameStats.longestSession) {
      this.gameState.gameStats.longestSession = sessionDuration;
    }

    // Stop intervals
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = undefined;
    }

    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }

    // Final save
    this.saveGame();

    this.emit('game:stopped', {
      timestamp: Date.now(),
      sessionDuration,
      totalPlayTime: this.gameState.totalPlayTime,
    });

    console.log('Game engine stopped');
  }

  /**
   * Start the main game loop
   */
  private startGameLoop(): void {
    this.gameLoopInterval = setInterval(() => {
      this.update();
    }, 100); // Update 10 times per second
  }

  /**
   * Main game update loop
   */
  private update(): void {
    if (!this.isRunning) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // Update active actions
    this.updateActiveActions(deltaTime);

    // Process idle progress
    this.processIdleProgress();

    // Update UI state
    this.updateUI();

    // Emit update event for systems to listen to
    this.emit('game:update', { deltaTime, timestamp: currentTime });
  }

  /**
   * Update all active actions
   */
  private updateActiveActions(deltaTime: number): void {
    const completedActions: string[] = [];

    this.gameState.activeActions = this.gameState.activeActions.filter(action => {
      action.endTime -= deltaTime;

      if (action.endTime <= 0) {
        completedActions.push(action.actionId);
        this.emit('action:completed', {
          actionId: action.actionId,
          rewards: [] // Will be populated by the action system
        });
        return false;
      }

      return true;
    });

    // Move completed actions to completed list
    completedActions.forEach(actionId => {
      if (!this.gameState.completedActions.includes(actionId)) {
        this.gameState.completedActions.push(actionId);
      }
    });

    // Update stats
    this.gameState.gameStats.totalActionsCompleted += completedActions.length;
  }

  /**
   * Process idle progress for background mechanics
   */
  private processIdleProgress(): void {
    // This will be expanded to handle various idle mechanics
    // For now, it's a placeholder for future implementation
  }

  /**
   * Update UI state and handle cleanup
   */
  private updateUI(): void {
    // Clean up expired tooltips
    const currentTime = Date.now();
    this.uiState.tooltips = this.uiState.tooltips.filter(tooltip => {
      if (tooltip.duration) {
        return (tooltip.timestamp + tooltip.duration) > currentTime;
      }
      return true;
    });
  }

  /**
   * Start auto-save functionality
   */
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      this.saveGame();
    }, this.gameState.settings.autoSaveInterval);
  }

  /**
   * Handle skill level ups
   */
  private handleSkillLevelUp(skillId: string, newLevel: number): void {
    console.log(`Skill ${skillId} reached level ${newLevel}`);

    // Update skill in game state
    if (skillId === 'woodcutting' && this.gameState.woodcutting) {
      this.gameState.woodcutting.level = newLevel;
    } else if (this.gameState.skills[skillId]) {
      this.gameState.skills[skillId].level = newLevel;
    }

    // Add notification
    this.addNotification({
      id: `level_up_${skillId}_${Date.now()}`,
      type: 'success',
      title: 'Level Up!',
      message: `${skillId.charAt(0).toUpperCase() + skillId.slice(1)} reached level ${newLevel}!`,
      duration: 5000,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle action completion
   */
  private handleActionCompletion(actionId: string, rewards: any[]): void {
    console.log(`Action ${actionId} completed with rewards:`, rewards);
    // This will be handled by specific action systems
  }

  /**
   * Initialize the skill system
   */
  private initializeSkillSystem(): void {
    // Initialize skill registry with basic configuration
    const skillConfig = {
      skills: [], // Will be populated by individual skill systems
      unlockOrder: ['woodcutting', 'fishing', 'mining', 'cooking', 'crafting'],
      globalRequirements: {},
    };

    skillRegistry.initialize(skillConfig);

    // Initialize and register all skill systems
    skillDataLoader.initialize(this);

    this.skillSystemInitialized = true;
    console.log('Skill system initialized with', skillDataLoader.getSkillCount(), 'skills');
  }

  /**
   * Handle experience gain
   */
  private handleExperienceGained(skillId: string, amount: number): void {
    this.gameState.gameStats.totalExperienceGained += amount;

    // Check for level up (legacy woodcutting handling)
    if (skillId === 'woodcutting' && this.gameState.woodcutting) {
      const skill = this.gameState.woodcutting;
      skill.experience += amount;

      while (skill.experience >= skill.experienceToNext && skill.level < GAME_CONSTANTS.MAX_LEVEL) {
        skill.experience -= skill.experienceToNext;
        skill.level++;
        skill.experienceToNext = this.calculateExperienceForLevel(skill.level + 1);

        this.emit('skill:level_up', { skillId, newLevel: skill.level });
      }
    }

    // Generic skill system handling is done by the individual skill systems
  }

  /**
   * Get the skill registry
   */
  public getSkillRegistry() {
    return skillRegistry;
  }

  /**
   * Get the skill data loader
   */
  public getSkillDataLoader() {
    return skillDataLoader;
  }

  /**
   * Get skill system by ID
   */
  public getSkillSystem(skillId: string) {
    return skillRegistry.getSkill(skillId);
  }

  /**
   * Get all available actions from all skills
   */
  public getAllAvailableActions() {
    return skillRegistry.getAllPerformableActions();
  }

  /**
   * Perform a skill action
   */
  public async performSkillAction(skillId: string, actionId: string, context?: any) {
    const skillSystem = skillRegistry.getSkill(skillId);
    if (!skillSystem) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    return await skillSystem.performAction(actionId, context);
  }

  /**
   * Calculate experience required for a specific level
   */
  private calculateExperienceForLevel(level: number): number {
    if (level <= 1) return GAME_CONSTANTS.BASE_EXPERIENCE;

    // Exponential curve: base * multiplier^(level-1)
    return Math.floor(
      GAME_CONSTANTS.BASE_EXPERIENCE *
      Math.pow(GAME_CONSTANTS.EXPERIENCE_MULTIPLIER, level - 1)
    );
  }

  /**
   * Add a notification to the UI state
   */
  public addNotification(notification: any): void {
    this.uiState.notifications.push(notification);
    this.emit('ui:notification', { notification });

    // Auto-remove notification after duration
    if (notification.duration) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }
  }

  /**
   * Remove a notification by ID
   */
  public removeNotification(notificationId: string): void {
    this.uiState.notifications = this.uiState.notifications.filter(
      notification => notification.id !== notificationId
    );
  }

  /**
   * Save the current game state
   */
  public async saveGame(): Promise<void> {
    try {
      // Save skill system states
      const skillData = this.skillSystemInitialized ? skillRegistry.saveAllSkills() : null;

      const saveData: SaveData = {
        version: __APP_VERSION__,
        gameState: this.gameState,
        metadata: {
          timestamp: Date.now(),
          playTime: this.gameState.totalPlayTime,
          checksum: await this.generateChecksum(this.gameState),
          deviceId: this.getDeviceId(),
          appVersion: __APP_VERSION__,
        },
      };

      // Include skill data if available
      if (skillData) {
        (saveData as any).skillData = skillData;
      }

      // Save to localStorage
      localStorage.setItem('kelvor_savegame', JSON.stringify(saveData));

      this.gameState.lastSaved = Date.now();
      this.emit('game:saved', { timestamp: Date.now() });

      if (this.gameState.settings.debugMode) {
        console.log('Game saved successfully');
      }
    } catch (error) {
      console.error('Failed to save game:', error);
      this.addNotification({
        id: `save_error_${Date.now()}`,
        type: 'error',
        title: 'Save Failed',
        message: 'Unable to save game progress. Please check your browser settings.',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Load game state from storage
   */
  public async loadGame(): Promise<boolean> {
    try {
      const saveDataString = localStorage.getItem('kelvor_savegame');
      if (!saveDataString) {
        console.log('No save game found');
        return false;
      }

      const saveData: SaveData = JSON.parse(saveDataString);

      // Verify save version compatibility
      if (saveData.version !== __APP_VERSION__) {
        console.warn('Save game version mismatch, attempting migration');
        // Migration logic would go here
      }

      // Verify checksum
      const isValid = await this.verifyChecksum(saveData.gameState, saveData.metadata.checksum);
      if (!isValid) {
        console.error('Save game checksum verification failed');
        return false;
      }

      // Load the game state
      this.gameState = saveData.gameState;

      // Load skill system states if available
      if (this.skillSystemInitialized && (saveData as any).skillData) {
        try {
          skillRegistry.loadAllSkills((saveData as any).skillData);
          console.log('Skill system states loaded');
        } catch (error) {
          console.error('Failed to load skill system states:', error);
          // Continue without skill data - will create new states
        }
      }

      this.emit('game:loaded', { timestamp: Date.now() });

      console.log('Game loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  /**
   * Generate a checksum for the game state
   */
  private async generateChecksum(gameState: GameState): Promise<string> {
    // Simple checksum implementation - in production, use a proper hashing algorithm
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
   * Verify the checksum of loaded game state
   */
  private async verifyChecksum(gameState: GameState, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.generateChecksum(gameState);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Get or generate a device ID for save identification
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
   * Get the current game state (read-only)
   */
  public getGameState(): Readonly<GameState> {
    return { ...this.gameState };
  }

  /**
   * Get the current UI state (read-only)
   */
  public getUIState(): Readonly<UIState> {
    return { ...this.uiState };
  }

  /**
   * Update game settings
   */
  public updateSettings(settings: DeepPartial<GameSettings>): void {
    this.gameState.settings = { ...this.gameState.settings, ...settings };

    // Restart auto-save if interval changed
    if (settings.autoSaveInterval !== undefined && this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      if (this.gameState.settings.autoSave) {
        this.startAutoSave();
      }
    }
  }

  /**
   * Add gold to player
   */
  public addGold(amount: number): void {
    this.gameState.player.gold += amount;
    this.gameState.gameStats.totalGoldEarned += amount;
    this.emit('player:gold_changed', { amount, newTotal: this.gameState.player.gold });
  }

  /**
   * Remove gold from player
   */
  public removeGold(amount: number): boolean {
    if (this.gameState.player.gold >= amount) {
      this.gameState.player.gold -= amount;
      this.emit('player:gold_changed', { amount: -amount, newTotal: this.gameState.player.gold });
      return true;
    }
    return false;
  }

  /**
   * Check if the game engine is running
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get session statistics
   */
  public getSessionStats(): {
    currentSession: number;
    totalPlayTime: number;
    sessionsPlayed: number;
  } {
    const currentSession = this.isRunning ? Date.now() - this.sessionStartTime : 0;
    return {
      currentSession,
      totalPlayTime: this.gameState.totalPlayTime + currentSession,
      sessionsPlayed: this.gameState.gameStats.sessionsPlayed,
    };
  }

  /**
   * Reset game to initial state
   */
  public resetGame(): void {
    this.stop();
    this.initializeGameState();
    this.initializeUIState();
    this.emit('game:reset', { timestamp: Date.now() });
    console.log('Game reset to initial state');
  }
}