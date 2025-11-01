/**
 * Skill Registry - Manages all skill systems in the game
 * Provides a centralized way to register, access, and manage skills
 */
import { eventSystem } from '@/core/EventSystem';
import { BaseSkillSystem } from './BaseSkillSystem';
import { Skill, SkillDetails, ActionRequirement } from '@/types';

export interface SkillRegistration {
  id: string;
  system: BaseSkillSystem;
  details: SkillDetails;
  isUnlocked: boolean;
  unlockRequirements: ActionRequirement[];
  position: number; // For UI ordering
}

export interface SkillRegistryConfig {
  skills: SkillDetails[];
  unlockOrder: string[];
  globalRequirements?: Record<string, ActionRequirement[]>;
}

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, SkillRegistration> = new Map();
  private unlockOrder: string[] = [];
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  /**
   * Initialize the skill registry
   */
  public initialize(config: SkillRegistryConfig): void {
    if (this.isInitialized) {
      console.warn('Skill registry already initialized');
      return;
    }

    this.unlockOrder = config.unlockOrder;

    // Register all skills
    config.skills.forEach(skillDetails => {
      // Note: Actual skill systems will be registered separately via registerSkill()
      this.registerSkillDetails(skillDetails);
    });

    this.setupEventListeners();
    this.isInitialized = true;

    console.log('Skill registry initialized with', config.skills.length, 'skills');
  }

  /**
   * Register a skill system
   */
  public registerSkill(system: BaseSkillSystem, details: SkillDetails, unlockRequirements: ActionRequirement[] = []): void {
    const skillId = system.getConfig().id;

    if (this.skills.has(skillId)) {
      console.warn(`Skill ${skillId} is already registered`);
      return;
    }

    // Determine position based on unlock order
    const position = this.unlockOrder.indexOf(skillId);
    if (position === -1) {
      console.warn(`Skill ${skillId} not found in unlock order, adding to end`);
      this.unlockOrder.push(skillId);
    }

    const registration: SkillRegistration = {
      id: skillId,
      system,
      details,
      isUnlocked: unlockRequirements.length === 0, // Auto-unlock if no requirements
      unlockRequirements,
      position: position !== -1 ? position : this.unlockOrder.length - 1,
    };

    this.skills.set(skillId, registration);

    // Initialize the skill system
    system.initialize();

    console.log(`Skill registered: ${skillId}`);
  }

  /**
   * Register skill details (for skills that will be registered later)
   */
  private registerSkillDetails(details: SkillDetails): void {
    // This allows us to have skill definitions even before the system is registered
    // Useful for UI planning and dependencies
  }

  /**
   * Get a skill system by ID
   */
  public getSkill(skillId: string): BaseSkillSystem | undefined {
    return this.skills.get(skillId)?.system;
  }

  /**
   * Get skill registration details
   */
  public getSkillRegistration(skillId: string): SkillRegistration | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Get all registered skills
   */
  public getAllSkills(): SkillRegistration[] {
    return Array.from(this.skills.values()).sort((a, b) => a.position - b.position);
  }

  /**
   * Get all unlocked skills
   */
  public getUnlockedSkills(): SkillRegistration[] {
    return this.getAllSkills().filter(reg => reg.isUnlocked);
  }

  /**
   * Get all locked skills
   */
  public getLockedSkills(): SkillRegistration[] {
    return this.getAllSkills().filter(reg => !reg.isUnlocked);
  }

  /**
   * Check if a skill is unlocked
   */
  public isSkillUnlocked(skillId: string): boolean {
    return this.skills.get(skillId)?.isUnlocked || false;
  }

  /**
   * Unlock a skill
   */
  public unlockSkill(skillId: string): boolean {
    const registration = this.skills.get(skillId);
    if (!registration) {
      console.warn(`Cannot unlock unknown skill: ${skillId}`);
      return false;
    }

    if (registration.isUnlocked) {
      console.warn(`Skill ${skillId} is already unlocked`);
      return true;
    }

    // Check unlock requirements
    if (!this.meetsUnlockRequirements(registration.unlockRequirements)) {
      console.warn(`Requirements not met for skill: ${skillId}`);
      return false;
    }

    registration.isUnlocked = true;

    // Emit unlock event
    eventSystem.emitGameEvent('skill:unlocked', { skillId });

    console.log(`Skill unlocked: ${skillId}`);
    return true;
  }

  /**
   * Check if unlock requirements are met
   */
  private meetsUnlockRequirements(requirements: ActionRequirement[]): boolean {
    // This would need access to game state - for now, assume they're met
    // In a full implementation, this would check player level, completed quests, etc.
    return true;
  }

  /**
   * Get skills that can be unlocked (requirements met)
   */
  public getUnlockableSkills(): SkillRegistration[] {
    return this.getLockedSkills().filter(reg =>
      this.meetsUnlockRequirements(reg.unlockRequirements)
    );
  }

  /**
   * Get skill statistics across all skills
   */
  public getAllSkillStatistics(): Record<string, any> {
    const statistics: Record<string, any> = {};

    this.skills.forEach((registration, skillId) => {
      statistics[skillId] = registration.system.getStatistics();
    });

    return statistics;
  }

  /**
   * Get total skill levels
   */
  public getTotalSkillLevel(): number {
    return Array.from(this.skills.values())
      .filter(reg => reg.isUnlocked)
      .reduce((total, reg) => total + reg.system.getState().level, 0);
  }

  /**
   * Get highest skill level
   */
  public getHighestSkillLevel(): number {
    const levels = Array.from(this.skills.values())
      .filter(reg => reg.isUnlocked)
      .map(reg => reg.system.getState().level);

    return levels.length > 0 ? Math.max(...levels) : 0;
  }

  /**
   * Get skills sorted by level (highest first)
   */
  public getSkillsByLevel(): SkillRegistration[] {
    return this.getUnlockedSkills()
      .sort((a, b) => b.system.getState().level - a.system.getState().level);
  }

  /**
   * Find skill by action ID
   */
  public findSkillByAction(actionId: string): BaseSkillSystem | undefined {
    for (const registration of this.skills.values()) {
      if (registration.system.getAction(actionId)) {
        return registration.system;
      }
    }
    return undefined;
  }

  /**
   * Get all available actions from unlocked skills
   */
  public getAllAvailableActions(): Array<{ skillId: string; action: any }> {
    const allActions: Array<{ skillId: string; action: any }> = [];

    this.getUnlockedSkills().forEach(registration => {
      const actions = registration.system.getAvailableActions();
      actions.forEach(action => {
        allActions.push({
          skillId: registration.id,
          action,
        });
      });
    });

    return allActions;
  }

  /**
   * Get all performable actions (requirements met)
   */
  public getAllPerformableActions(): Array<{ skillId: string; action: any }> {
    const performableActions: Array<{ skillId: string; action: any }> = [];

    this.getUnlockedSkills().forEach(registration => {
      const actions = registration.system.getPerformableActions();
      actions.forEach(action => {
        performableActions.push({
          skillId: registration.id,
          action,
        });
      });
    });

    return performableActions;
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen to global events that might affect skill unlocks
    eventSystem.onGameEvent('player:level_up', (event) => {
      this.checkForSkillUnlocks();
    });

    eventSystem.onGameEvent('quest:completed', (event) => {
      this.checkForSkillUnlocks();
    });
  }

  /**
   * Check if any skills can now be unlocked
   */
  private checkForSkillUnlocks(): void {
    const unlockableSkills = this.getUnlockableSkills();
    unlockableSkills.forEach(registration => {
      this.unlockSkill(registration.id);
    });
  }

  /**
   * Save all skill states
   */
  public saveAllSkills(): Record<string, any> {
    const savedData: Record<string, any> = {};

    this.skills.forEach((registration, skillId) => {
      savedData[skillId] = {
        state: registration.system.saveState(),
        isUnlocked: registration.isUnlocked,
      };
    });

    return {
      skills: savedData,
      unlockOrder: this.unlockOrder,
    };
  }

  /**
   * Load all skill states
   */
  public loadAllSkills(data: Record<string, any>): void {
    if (!data.skills || !data.unlockOrder) {
      console.warn('Invalid skill data provided');
      return;
    }

    this.unlockOrder = data.unlockOrder;

    Object.entries(data.skills).forEach(([skillId, skillData]: [string, any]) => {
      const registration = this.skills.get(skillId);
      if (registration && skillData.state) {
        registration.system.loadState(skillData.state);
        registration.isUnlocked = skillData.isUnlocked || false;
      }
    });

    console.log('All skill states loaded');
  }

  /**
   * Reset all skills
   */
  public resetAllSkills(): void {
    this.skills.forEach(registration => {
      registration.system.reset();
      registration.isUnlocked = registration.unlockRequirements.length === 0;
    });

    console.log('All skills reset');
  }

  /**
   * Get registry statistics
   */
  public getRegistryStatistics(): {
    totalSkills: number;
    unlockedSkills: number;
    lockedSkills: number;
    totalLevel: number;
    highestLevel: number;
    totalActions: number;
    unlockedActions: number;
  } {
    const unlockedSkills = this.getUnlockedSkills();
    const totalActions = this.getAllAvailableActions().length;
    const unlockedActions = this.getAllPerformableActions().length;

    return {
      totalSkills: this.skills.size,
      unlockedSkills: unlockedSkills.length,
      lockedSkills: this.skills.size - unlockedSkills.length,
      totalLevel: this.getTotalSkillLevel(),
      highestLevel: this.getHighestSkillLevel(),
      totalActions,
      unlockedActions,
    };
  }

  /**
   * Check if registry is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Destroy the registry and clean up all skills
   */
  public destroy(): void {
    this.skills.forEach(registration => {
      registration.system.destroy();
    });

    this.skills.clear();
    this.unlockOrder = [];
    this.isInitialized = false;

    // Remove event listeners
    eventSystem.removeAllGameEventListeners('player:level_up');
    eventSystem.removeAllGameEventListeners('quest:completed');

    console.log('Skill registry destroyed');
  }
}

// Export singleton instance
export const skillRegistry = SkillRegistry.getInstance();