/**
 * Skill Data Loader - Loads and registers all skill systems
 * This is the main entry point for initializing all skills in the game
 */
import { GameEngine } from '@/core/GameEngine';
import { skillRegistry } from './SkillRegistry';
import { WoodcuttingSkillSystem } from './WoodcuttingSkillSystem';
import { SkillDetails } from '@/types';

export interface SkillRegistrationData {
  system: any; // Constructor for skill system
  details: SkillDetails;
  unlockRequirements?: any[];
}

export class SkillDataLoader {
  private static instance: SkillDataLoader;
  private skills: Map<string, SkillRegistrationData> = new Map();
  private gameEngine?: GameEngine;

  private constructor() {}

  public static getInstance(): SkillDataLoader {
    if (!SkillDataLoader.instance) {
      SkillDataLoader.instance = new SkillDataLoader();
    }
    return SkillDataLoader.instance;
  }

  /**
   * Initialize all skills with the game engine
   */
  public initialize(gameEngine: GameEngine): void {
    this.gameEngine = gameEngine;
    this.registerSkillDefinitions();
    this.initializeSkillSystems();
  }

  /**
   * Register all skill definitions
   */
  private registerSkillDefinitions(): void {
    // Woodcutting
    this.registerSkill('woodcutting', {
      system: WoodcuttingSkillSystem,
      details: {
        id: 'woodcutting',
        name: 'Woodcutting',
        description: 'Chop down trees to gather logs and gain experience',
        icon: '🪓',
        maxLevel: 99,
        experienceCurve: 'exponential',
        actions: [], // Will be loaded from the skill system itself
      },
      unlockRequirements: [], // Always available from start
    });

    // Future skills can be registered here
    // this.registerSkill('fishing', { system: FishingSkillSystem, ... });
    // this.registerSkill('mining', { system: MiningSkillSystem, ... });
    // this.registerSkill('cooking', { system: CookingSkillSystem, ... });
    // this.registerSkill('crafting', { system: CraftingSkillSystem, ... });
  }

  /**
   * Register a single skill definition
   */
  private registerSkill(skillId: string, data: SkillRegistrationData): void {
    this.skills.set(skillId, data);
  }

  /**
   * Initialize all registered skill systems
   */
  private initializeSkillSystems(): void {
    if (!this.gameEngine) {
      throw new Error('Game engine not initialized');
    }

    this.skills.forEach((data, skillId) => {
      try {
        // Create skill system instance
        const skillSystem = new data.system(this.gameEngine!);

        // Register with skill registry
        skillRegistry.registerSkill(
          skillSystem,
          data.details,
          data.unlockRequirements || []
        );

        console.log(`Skill system initialized: ${skillId}`);
      } catch (error) {
        console.error(`Failed to initialize skill system ${skillId}:`, error);
      }
    });
  }

  /**
   * Get a specific skill system
   */
  public getSkillSystem(skillId: string) {
    return skillRegistry.getSkill(skillId);
  }

  /**
   * Get all skill systems
   */
  public getAllSkillSystems() {
    return skillRegistry.getAllSkills();
  }

  /**
   * Get skill statistics across all skills
   */
  public getAllSkillStatistics() {
    return skillRegistry.getAllSkillStatistics();
  }

  /**
   * Save all skill states
   */
  public saveAllSkills() {
    return skillRegistry.saveAllSkills();
  }

  /**
   * Load all skill states
   */
  public loadAllSkills(data: any) {
    return skillRegistry.loadAllSkills(data);
  }

  /**
   * Reset all skills
   */
  public resetAllSkills() {
    return skillRegistry.resetAllSkills();
  }

  /**
   * Get skills that are ready to be unlocked
   */
  public getUnlockableSkills() {
    return skillRegistry.getUnlockableSkills();
  }

  /**
   * Check if a specific skill is unlocked
   */
  public isSkillUnlocked(skillId: string): boolean {
    return skillRegistry.isSkillUnlocked(skillId);
  }

  /**
   * Unlock a specific skill
   */
  public unlockSkill(skillId: string): boolean {
    return skillRegistry.unlockSkill(skillId);
  }

  /**
   * Get registry statistics
   */
  public getStatistics() {
    return skillRegistry.getRegistryStatistics();
  }

  /**
   * Destroy all skill systems
   */
  public destroy(): void {
    skillRegistry.destroy();
    this.skills.clear();
    this.gameEngine = undefined;
  }

  /**
   * Get available skill IDs for development/debugging
   */
  public getAvailableSkillIds(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * Add a new skill dynamically (for plugins/mods)
   */
  public addSkill(skillId: string, data: SkillRegistrationData): void {
    if (this.skills.has(skillId)) {
      console.warn(`Skill ${skillId} already registered`);
      return;
    }

    this.registerSkill(skillId, data);

    // Initialize immediately if game engine is available
    if (this.gameEngine) {
      try {
        const skillSystem = new data.system(this.gameEngine);
        skillRegistry.registerSkill(
          skillSystem,
          data.details,
          data.unlockRequirements || []
        );
        console.log(`Dynamic skill added: ${skillId}`);
      } catch (error) {
        console.error(`Failed to add dynamic skill ${skillId}:`, error);
      }
    }
  }

  /**
   * Remove a skill dynamically
   */
  public removeSkill(skillId: string): boolean {
    if (!this.skills.has(skillId)) {
      console.warn(`Skill ${skillId} not found`);
      return false;
    }

    const registration = skillRegistry.getSkillRegistration(skillId);
    if (registration) {
      registration.system.destroy();
    }

    this.skills.delete(skillId);
    console.log(`Skill removed: ${skillId}`);
    return true;
  }

  /**
   * Get skill details without initializing the system
   */
  public getSkillDetails(skillId: string): SkillDetails | undefined {
    return this.skills.get(skillId)?.details;
  }

  /**
   * Check if a skill is registered
   */
  public isSkillRegistered(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  /**
   * Get total number of registered skills
   */
  public getSkillCount(): number {
    return this.skills.size;
  }

  /**
   * Validate skill data integrity
   */
  public validateSkillData(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    this.skills.forEach((data, skillId) => {
      // Check required fields
      if (!data.details.id || data.details.id !== skillId) {
        errors.push(`Skill ${skillId}: Invalid or mismatching ID`);
      }

      if (!data.details.name) {
        errors.push(`Skill ${skillId}: Missing name`);
      }

      if (!data.details.description) {
        errors.push(`Skill ${skillId}: Missing description`);
      }

      if (!data.details.icon) {
        errors.push(`Skill ${skillId}: Missing icon`);
      }

      if (typeof data.details.maxLevel !== 'number' || data.details.maxLevel <= 0) {
        errors.push(`Skill ${skillId}: Invalid max level`);
      }

      if (!['linear', 'exponential', 'custom'].includes(data.details.experienceCurve)) {
        errors.push(`Skill ${skillId}: Invalid experience curve`);
      }

      // Check if system constructor exists
      if (typeof data.system !== 'function') {
        errors.push(`Skill ${skillId}: Invalid system constructor`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const skillDataLoader = SkillDataLoader.getInstance();