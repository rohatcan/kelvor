/**
 * Base skill system that can be extended for any skill type
 * Provides common functionality for XP, leveling, actions, and progression
 */
import { eventSystem } from '@/core/EventSystem';
import {
  Skill,
  SkillAction,
  SkillDetails,
  ActionRequirement,
  ActionReward,
  ActionResult,
  ActiveAction,
  GAME_CONSTANTS,
  GameEventMap,
  GameEventType,
} from '@/types';

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  experienceCurve: 'linear' | 'exponential' | 'custom';
  baseExperience: number;
  experienceMultiplier: number;
  actions: SkillAction[];
  skillSpecificData?: any;
}

export interface SkillProgress {
  level: number;
  experience: number;
  experienceToNext: number;
  totalExperienceGained: number;
  actionsCompleted: number;
  timeSpent: number;
}

export interface SkillState extends Skill {
  progress: SkillProgress;
  unlockedActions: string[];
  activeAction?: ActiveAction;
  skillSpecificState?: any;
}

export abstract class BaseSkillSystem {
  protected config: SkillConfig;
  protected state: SkillState;
  protected isInitialized: boolean = false;

  constructor(config: SkillConfig) {
    this.config = config;
    this.state = this.createInitialState();
  }

  /**
   * Create initial skill state
   */
  protected createInitialState(): SkillState {
    return {
      id: this.config.id,
      name: this.config.name,
      level: 1,
      experience: 0,
      experienceToNext: this.calculateExperienceForLevel(2),
      progress: {
        level: 1,
        experience: 0,
        experienceToNext: this.calculateExperienceForLevel(2),
        totalExperienceGained: 0,
        actionsCompleted: 0,
        timeSpent: 0,
      },
      unlockedActions: this.getInitialUnlockedActions(),
    };
  }

  /**
   * Get actions unlocked at starting level
   */
  protected getInitialUnlockedActions(): string[] {
    return this.config.actions
      .filter(action => this.meetsRequirements(action.requirements))
      .map(action => action.id);
  }

  /**
   * Initialize the skill system
   */
  public initialize(): void {
    if (this.isInitialized) return;

    this.setupEventListeners();
    this.onInitialize();
    this.isInitialized = true;

    console.log(`Skill system initialized: ${this.config.name}`);
  }

  /**
   * Set up event listeners for this skill
   */
  protected setupEventListeners(): void {
    // Listen to generic skill events
    eventSystem.onGameEvent('player:experience_gained', (event) => {
      if (event.payload.skillId === this.config.id) {
        this.handleExperienceGained(event.payload.amount);
      }
    });

    eventSystem.onGameEvent('action:completed', (event) => {
      if (event.payload.actionId.startsWith(`${this.config.id}:`)) {
        this.handleActionCompleted(event.payload.actionId, event.payload.rewards);
      }
    });

    // Set up skill-specific event listeners
    this.setupSkillSpecificEventListeners();
  }

  /**
   * Override in subclasses to set up skill-specific event listeners
   */
  protected abstract setupSkillSpecificEventListeners(): void;

  /**
   * Override in subclasses for skill-specific initialization
   */
  protected abstract onInitialize(): void;

  /**
   * Get current skill state
   */
  public getState(): SkillState {
    return { ...this.state };
  }

  /**
   * Get skill configuration
   */
  public getConfig(): SkillConfig {
    return { ...this.config };
  }

  /**
   * Get all available actions
   */
  public getActions(): SkillAction[] {
    return [...this.config.actions];
  }

  /**
   * Get actions available at current level
   */
  public getAvailableActions(): SkillAction[] {
    return this.config.actions.filter(action =>
      this.state.unlockedActions.includes(action.id)
    );
  }

  /**
   * Get action by ID
   */
  public getAction(actionId: string): SkillAction | undefined {
    return this.config.actions.find(action => action.id === actionId);
  }

  /**
   * Check if requirements are met for an action
   */
  public meetsRequirements(requirements: ActionRequirement[]): boolean {
    // Ensure state is properly initialized
    if (!this.state || typeof this.state.level !== 'number') {
      console.warn(`Skill system state not properly initialized for ${this.config.id}`);
      return false;
    }

    return requirements.every(req => {
      switch (req.type) {
        case 'skill':
          return req.value === this.config.id && this.state.level >= (req.amount || 1);
        case 'level':
          return this.state.level >= (req.amount || 1);
        case 'item':
          // Check if player has required item
          return this.hasItem(req.value as string, req.amount || 1);
        case 'gold':
          // Check if player has enough gold
          return this.hasGold(req.amount || 0);
        case 'quest':
          // Check if quest is completed
          return this.hasCompletedQuest(req.value as string);
        default:
          return false;
      }
    });
  }

  /**
   * Get actions that can be performed with current state
   */
  public getPerformableActions(): SkillAction[] {
    return this.getAvailableActions().filter(action =>
      this.meetsRequirements(action.requirements)
    );
  }

  /**
   * Start performing an action
   */
  public async performAction(actionId: string, context?: any): Promise<ActionResult> {
    const action = this.getAction(actionId);
    if (!action) {
      return {
        success: false,
        rewards: [],
        experience: {},
        failureReason: 'Action not found',
      };
    }

    // Check if action is available
    if (!this.state.unlockedActions.includes(actionId)) {
      return {
        success: false,
        rewards: [],
        experience: {},
        failureReason: 'Action not unlocked',
      };
    }

    // Check requirements
    if (!this.meetsRequirements(action.requirements)) {
      return {
        success: false,
        rewards: [],
        experience: {},
        failureReason: 'Requirements not met',
      };
    }

    // Check if already performing an action
    if (this.state.activeAction) {
      return {
        success: false,
        rewards: [],
        experience: {},
        failureReason: 'Already performing an action',
      };
    }

    // Calculate action duration
    const duration = this.calculateActionDuration(action, context);

    // Create active action
    this.state.activeAction = {
      actionId,
      startTime: Date.now(),
      endTime: Date.now() + duration,
      repeats: 1,
      currentRepeat: 0,
    };

    // Emit action started event
    eventSystem.emitGameEvent('action:started', { actionId, duration });

    // Perform the action
    const result = await this.executeAction(action, context);

    // Clear active action
    this.state.activeAction = undefined;

    // Update statistics
    this.state.progress.actionsCompleted++;
    this.state.progress.timeSpent += duration;

    // Emit completion event
    if (result.success) {
      eventSystem.emitGameEvent('action:completed', { actionId, rewards: result.rewards });
    } else {
      eventSystem.emitGameEvent('action:failed', { actionId, reason: result.failureReason });
    }

    return result;
  }

  /**
   * Calculate action duration based on skill level and other factors
   */
  protected calculateActionDuration(action: SkillAction, context?: any): number {
    let duration = action.baseTime;

    // Apply level scaling (faster with higher levels)
    const levelBonus = 1 - ((this.state.level - 1) * action.levelScaling);
    duration *= Math.max(0.1, levelBonus);

    // Apply skill-specific modifiers
    const skillModifier = this.getActionDurationModifier(action, context);
    duration *= skillModifier;

    return Math.floor(duration);
  }

  /**
   * Override in subclasses to apply skill-specific duration modifiers
   */
  protected abstract getActionDurationModifier(action: SkillAction, context?: any): number;

  /**
   * Execute the action and return results
   */
  protected async executeAction(action: SkillAction, context?: any): Promise<ActionResult> {
    // Calculate success chance
    const successChance = this.calculateSuccessChance(action, context);
    const isSuccess = Math.random() < successChance;

    if (!isSuccess) {
      return {
        success: false,
        rewards: [],
        experience: {},
        failureReason: 'Action failed',
      };
    }

    // Calculate critical hit
    const criticalChance = this.calculateCriticalChance(action, context);
    const isCriticalHit = Math.random() < criticalChance;

    // Calculate rewards
    const rewards = this.calculateRewards(action, context, isCriticalHit);
    const experience = this.calculateActionExperience(action, context, isCriticalHit);

    // Apply skill-specific effects
    this.applyActionEffects(action, context, rewards, isCriticalHit);

    return {
      success: true,
      rewards,
      experience,
      critBonus: isCriticalHit ? this.getCriticalMultiplier() : undefined,
    };
  }

  /**
   * Calculate success chance for an action
   */
  protected calculateSuccessChance(action: SkillAction, context?: any): number {
    // Base success chance starts at 50% and improves with level
    let successChance = 0.5;

    // Level bonus (1% per level above requirement)
    const requiredLevel = this.getRequiredLevelForAction(action);
    const levelBonus = Math.min(0.4, (this.state.level - requiredLevel) * 0.01);
    successChance += levelBonus;

    // Apply skill-specific modifiers
    successChance *= this.getSuccessChanceModifier(action, context);

    return Math.min(0.95, Math.max(0.05, successChance));
  }

  /**
   * Get the required level for an action
   */
  protected getRequiredLevelForAction(action: SkillAction): number {
    const skillReq = action.requirements.find(req => req.type === 'skill' && req.value === this.config.id);
    return skillReq?.amount || 1;
  }

  /**
   * Override in subclasses to apply skill-specific success chance modifiers
   */
  protected abstract getSuccessChanceModifier(action: SkillAction, context?: any): number;

  /**
   * Calculate critical hit chance
   */
  protected calculateCriticalChance(action: SkillAction, context?: any): number {
    // Base 5% critical chance
    let criticalChance = 0.05;

    // Level bonus (0.1% per level)
    criticalChance += this.state.level * 0.001;

    // Apply skill-specific modifiers
    criticalChance *= this.getCriticalChanceModifier(action, context);

    return Math.min(0.25, criticalChance);
  }

  /**
   * Override in subclasses to apply skill-specific critical chance modifiers
   */
  protected abstract getCriticalChanceModifier(action: SkillAction, context?: any): number;

  /**
   * Calculate rewards for an action
   */
  protected calculateRewards(action: SkillAction, context?: any, isCriticalHit: boolean = false): ActionReward[] {
    const rewards: ActionReward[] = [];

    action.rewards.forEach(reward => {
      let amount = reward.amount || 1;

      // Apply chance
      if (reward.chance && Math.random() > reward.chance) {
        return;
      }

      // Apply critical hit bonus
      if (isCriticalHit) {
        amount = Math.floor(amount * this.getCriticalMultiplier());
      }

      // Apply skill-specific reward modifiers
      amount = this.modifyRewardAmount(reward, amount, context, isCriticalHit);

      if (amount > 0) {
        rewards.push({
          ...reward,
          amount,
        });
      }
    });

    return rewards;
  }

  /**
   * Override in subclasses to modify reward amounts
   */
  protected abstract modifyRewardAmount(reward: ActionReward, amount: number, context?: any, isCriticalHit?: boolean): number;

  /**
   * Calculate experience gained from an action
   */
  protected calculateActionExperience(action: SkillAction, context?: any, isCriticalHit: boolean = false): Record<string, number> {
    // Find experience rewards in the action
    const experienceRewards = action.rewards.filter(reward => reward.type === 'experience');
    const experience: Record<string, number> = {};

    experienceRewards.forEach(reward => {
      if (reward.value === this.config.id) {
        let amount = reward.amount || 0;

        // Apply level scaling (reduced XP for overlevel)
        const requiredLevel = this.getRequiredLevelForAction(action);
        const levelDiff = this.state.level - requiredLevel;
        if (levelDiff > 0) {
          const reduction = Math.min(0.5, levelDiff * 0.02);
          amount *= (1 - reduction);
        }

        // Apply critical hit bonus
        if (isCriticalHit) {
          amount *= this.getCriticalMultiplier();
        }

        experience[this.config.id] = Math.floor(amount);
      }
    });

    return experience;
  }

  /**
   * Get critical hit multiplier
   */
  protected getCriticalMultiplier(): number {
    return 2.0; // Double rewards on critical hit
  }

  /**
   * Apply skill-specific effects when an action is completed
   */
  protected abstract applyActionEffects(action: SkillAction, context?: any, rewards: ActionReward[], isCriticalHit?: boolean): void;

  /**
   * Handle experience gained
   */
  protected handleExperienceGained(amount: number): void {
    this.state.progress.totalExperienceGained += amount;

    // Check for level up
    let levelUps = 0;
    while (this.state.progress.experience >= this.state.progress.experienceToNext &&
           this.state.progress.level < this.config.maxLevel) {
      this.state.progress.experience -= this.state.progress.experienceToNext;
      this.state.progress.level++;
      this.state.progress.experienceToNext = this.calculateExperienceForLevel(this.state.progress.level + 1);
      levelUps++;

      // Check for new unlocked actions
      this.checkForUnlockedActions();
    }

    // Update main skill properties
    this.state.level = this.state.progress.level;
    this.state.experience = this.state.progress.experience;
    this.state.experienceToNext = this.state.progress.experienceToNext;

    // Emit level up events
    for (let i = 0; i < levelUps; i++) {
      eventSystem.emitGameEvent('skill:level_up', {
        skillId: this.config.id,
        newLevel: this.state.progress.level
      });
    }
  }

  /**
   * Check for newly unlocked actions
   */
  protected checkForUnlockedActions(): void {
    const newlyUnlocked = this.config.actions.filter(action =>
      !this.state.unlockedActions.includes(action.id) &&
      this.meetsRequirements(action.requirements)
    );

    newlyUnlocked.forEach(action => {
      this.state.unlockedActions.push(action.id);
      eventSystem.emitGameEvent('skill:action_unlocked', {
        skillId: this.config.id,
        actionId: action.id
      });
    });
  }

  /**
   * Handle action completion
   */
  protected handleActionCompleted(actionId: string, rewards: ActionReward[]): void {
    // Override in subclasses for skill-specific handling
  }

  /**
   * Calculate experience required for a specific level
   */
  protected calculateExperienceForLevel(level: number): number {
    if (level <= 1) return this.config.baseExperience;

    switch (this.config.experienceCurve) {
      case 'linear':
        return this.config.baseExperience * level;

      case 'exponential':
        return Math.floor(
          this.config.baseExperience *
          Math.pow(this.config.experienceMultiplier, level - 1)
        );

      case 'custom':
        return this.calculateCustomExperience(level);

      default:
        return this.config.baseExperience * level;
    }
  }

  /**
   * Override in subclasses for custom experience curves
   */
  protected calculateCustomExperience(level: number): number {
    return this.config.baseExperience * level;
  }

  /**
   * Get current progress to next level (0-1)
   */
  public getProgressToNext(): number {
    if (this.state.progress.level >= this.config.maxLevel) {
      return 1.0;
    }
    return this.state.progress.experience / this.state.progress.experienceToNext;
  }

  /**
   * Get skill statistics
   */
  public getStatistics(): {
    currentLevel: number;
    totalExperience: number;
    experienceToNext: number;
    progressToNext: number;
    actionsCompleted: number;
    timeSpent: number;
    actionsUnlocked: number;
    totalActions: number;
  } {
    return {
      currentLevel: this.state.progress.level,
      totalExperience: this.state.progress.totalExperienceGained,
      experienceToNext: this.state.progress.experienceToNext,
      progressToNext: this.getProgressToNext(),
      actionsCompleted: this.state.progress.actionsCompleted,
      timeSpent: this.state.progress.timeSpent,
      actionsUnlocked: this.state.unlockedActions.length,
      totalActions: this.config.actions.length,
    };
  }

  /**
   * Save skill state
   */
  public saveState(): any {
    return {
      config: this.config,
      state: this.state,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Load skill state
   */
  public loadState(data: any): void {
    if (data.state) {
      this.state = { ...this.state, ...data.state };
    }
    if (data.isInitialized && !this.isInitialized) {
      this.initialize();
    }
  }

  // Abstract methods for resource checking (to be implemented based on game context)
  protected abstract hasItem(itemId: string, amount: number): boolean;
  protected abstract hasGold(amount: number): boolean;
  protected abstract hasCompletedQuest(questId: string): boolean;

  /**
   * Get next milestones for the skill
   */
  public getNextMilestones(): Array<{ level: number; reward: string }> {
    const milestones = [];
    const currentLevel = this.state.progress.level;

    // Action unlock milestones
    this.config.actions.forEach(action => {
      const requiredLevel = this.getRequiredLevelForAction(action);
      if (requiredLevel > currentLevel && !milestones.find(m => m.level === requiredLevel)) {
        milestones.push({
          level: requiredLevel,
          reward: `Unlock ${action.name}`,
        });
      }
    });

    // Level milestones
    const milestoneLevels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99];
    milestoneLevels.forEach(level => {
      if (level > currentLevel && level <= this.config.maxLevel) {
        milestones.push({
          level,
          reward: `Level ${level} Milestone`,
        });
      }
    });

    return milestones.sort((a, b) => a.level - b.level).slice(0, 3);
  }

  /**
   * Reset skill to initial state
   */
  public reset(): void {
    this.state = this.createInitialState();
    console.log(`Skill reset: ${this.config.name}`);
  }

  /**
   * Cleanup method
   */
  public destroy(): void {
    // Remove event listeners
    eventSystem.removeAllGameEventListeners('player:experience_gained');
    eventSystem.removeAllGameEventListeners('action:completed');

    // Skill-specific cleanup
    this.onDestroy();

    this.isInitialized = false;
  }

  /**
   * Override in subclasses for skill-specific cleanup
   */
  protected abstract onDestroy(): void;
}