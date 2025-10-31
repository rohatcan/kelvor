/**
 * GameCalculations - Utility functions for XP calculations, level progression, and time-based mechanics
 */
import { GAME_CONSTANTS } from '@/types';

export interface ExperienceCurve {
  calculateExperienceForLevel(level: number): number;
  calculateTotalExperienceForLevel(level: number): number;
  calculateLevelFromExperience(experience: number): number;
  getProgressToNextLevel(currentExperience: number, level: number): number;
}

export interface TimeCalculations {
  formatDuration(milliseconds: number): string;
  formatTimeRemaining(milliseconds: number): string;
  calculateIdleProgress(startTime: number, endTime: number, actionDuration: number): number;
  calculateOfflineProgress(lastActive: number, maxIdleTime: number): {
    timeAway: number;
    efficiency: number;
    effectiveTime: number;
  };
}

export interface ProbabilityCalculations {
  calculateSuccessChance(baseChance: number, levelBonus: number, toolBonus: number): number;
  calculateCriticalHitChance(baseChance: number, level: number): number;
  calculateRandomReward(baseReward: number, variance: number): number;
  rollForChance(chance: number): boolean;
}

export interface StatCalculations {
  calculateCombatLevel(stats: any): number;
  calculateTotalLevel(skills: any[]): number;
  calculateSkillProgress(currentXP: number, level: number): number;
  calculateEquipmentBonus(equipment: any[]): any;
}

/**
 * Experience calculation utilities
 */
export class ExperienceCalculator implements ExperienceCurve {
  private curveType: 'linear' | 'exponential' | 'custom';
  private baseExperience: number;
  private multiplier: number;

  constructor(
    curveType: 'linear' | 'exponential' | 'custom' = 'exponential',
    baseExperience: number = GAME_CONSTANTS.BASE_EXPERIENCE,
    multiplier: number = GAME_CONSTANTS.EXPERIENCE_MULTIPLIER
  ) {
    this.curveType = curveType;
    this.baseExperience = baseExperience;
    this.multiplier = multiplier;
  }

  /**
   * Calculate experience needed for a specific level
   */
  public calculateExperienceForLevel(level: number): number {
    if (level <= 1) return 0;
    if (level > GAME_CONSTANTS.MAX_LEVEL) return Infinity;

    switch (this.curveType) {
      case 'linear':
        return this.baseExperience * (level - 1);

      case 'exponential':
        return Math.floor(
          this.baseExperience * Math.pow(this.multiplier, level - 2)
        );

      case 'custom':
        // Custom formula: slower at first, then exponential
        if (level <= 10) {
          return Math.floor(this.baseExperience * (level - 1) * 1.5);
        } else if (level <= 50) {
          return Math.floor(
            this.baseExperience * Math.pow(this.multiplier, level - 10) * 15
          );
        } else {
          return Math.floor(
            this.baseExperience * Math.pow(this.multiplier * 1.2, level - 20) * 50
          );
        }

      default:
        return this.baseExperience * (level - 1);
    }
  }

  /**
   * Calculate total experience needed to reach a specific level
   */
  public calculateTotalExperienceForLevel(level: number): number {
    let totalXP = 0;
    for (let i = 2; i <= level; i++) {
      totalXP += this.calculateExperienceForLevel(i);
    }
    return totalXP;
  }

  /**
   * Calculate level from total experience
   */
  public calculateLevelFromExperience(experience: number): number {
    let level = 1;
    let totalXP = 0;

    while (level < GAME_CONSTANTS.MAX_LEVEL) {
      const xpForNextLevel = this.calculateExperienceForLevel(level + 1);
      if (totalXP + xpForNextLevel > experience) {
        break;
      }
      totalXP += xpForNextLevel;
      level++;
    }

    return level;
  }

  /**
   * Get progress percentage to next level
   */
  public getProgressToNextLevel(currentExperience: number, level: number): number {
    if (level >= GAME_CONSTANTS.MAX_LEVEL) return 1;

    const xpForCurrentLevel = this.calculateTotalExperienceForLevel(level);
    const xpForNextLevel = this.calculateTotalExperienceForLevel(level + 1);
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const xpProgress = currentExperience - xpForCurrentLevel;

    return Math.min(1, Math.max(0, xpProgress / xpNeeded));
  }

  /**
   * Calculate experience with bonuses
   */
  public calculateExperienceWithBonus(
    baseExperience: number,
    bonuses: {
      levelBonus?: number;
      toolBonus?: number;
      eventBonus?: number;
      membershipBonus?: number;
    }
  ): number {
    let totalExperience = baseExperience;
    let totalMultiplier = 1;

    if (bonuses.levelBonus) {
      totalMultiplier += bonuses.levelBonus;
    }

    if (bonuses.toolBonus) {
      totalMultiplier += bonuses.toolBonus;
    }

    if (bonuses.eventBonus) {
      totalMultiplier += bonuses.eventBonus;
    }

    if (bonuses.membershipBonus) {
      totalMultiplier += bonuses.membershipBonus;
    }

    totalExperience = Math.floor(totalExperience * totalMultiplier);

    // Apply minimum experience threshold
    return Math.max(1, totalExperience);
  }
}

/**
 * Time calculation utilities
 */
export class TimeCalculator implements TimeCalculations {
  /**
   * Format duration in milliseconds to human readable string
   */
  public formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Format time remaining in a countdown-friendly way
   */
  public formatTimeRemaining(milliseconds: number): string {
    if (milliseconds <= 0) return 'Complete';

    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.ceil(seconds / 60);
    const hours = Math.ceil(minutes / 60);
    const days = Math.ceil(hours / 24);

    if (days > 1) {
      return `~${days} days`;
    } else if (days === 1) {
      return `~1 day`;
    } else if (hours > 1) {
      return `~${hours} hours`;
    } else if (hours === 1) {
      return `~1 hour`;
    } else if (minutes > 1) {
      return `~${minutes} minutes`;
    } else if (minutes === 1) {
      return `~1 minute`;
    } else {
      return `${seconds} seconds`;
    }
  }

  /**
   * Calculate idle progress for an action
   */
  public calculateIdleProgress(
    startTime: number,
    endTime: number,
    actionDuration: number
  ): number {
    const elapsedTime = endTime - startTime;
    return Math.floor(elapsedTime / actionDuration);
  }

  /**
   * Calculate offline progress with efficiency decay
   */
  public calculateOfflineProgress(lastActive: number, maxIdleTime: number): {
    timeAway: number;
    efficiency: number;
    effectiveTime: number;
  } {
    const currentTime = Date.now();
    const timeAway = currentTime - lastActive;

    // Cap at maximum idle time
    const cappedTimeAway = Math.min(timeAway, maxIdleTime);

    // Calculate efficiency (decays over time)
    let efficiency = 1;
    if (timeAway > 0) {
      // Efficiency starts at 100% and drops to 10% over maxIdleTime
      efficiency = Math.max(0.1, 1 - (timeAway / maxIdleTime) * 0.9);
    }

    const effectiveTime = Math.floor(cappedTimeAway * efficiency);

    return {
      timeAway,
      efficiency,
      effectiveTime,
    };
  }

  /**
   * Calculate action queue timing
   */
  public calculateActionQueueTiming(
    actions: Array<{ duration: number; quantity: number }>,
    startTime: number = Date.now()
  ): Array<{ startTime: number; endTime: number; actionIndex: number }> {
    const timing: Array<{ startTime: number; endTime: number; actionIndex: number }> = [];
    let currentTime = startTime;

    actions.forEach((action, index) => {
      for (let i = 0; i < action.quantity; i++) {
        const actionStartTime = currentTime;
        const actionEndTime = currentTime + action.duration;

        timing.push({
          startTime: actionStartTime,
          endTime: actionEndTime,
          actionIndex: index,
        });

        currentTime = actionEndTime;
      }
    });

    return timing;
  }

  /**
   * Get optimal action timing for skill training
   */
  public getOptimalActionTiming(
    baseDuration: number,
    skillLevel: number
  ): {
    duration: number;
    actionsPerHour: number;
    experiencePerHour: number;
  } {
    // Calculate level bonus (2% faster per level)
    const levelBonus = 1 + (skillLevel - 1) * 0.02;
    const adjustedDuration = Math.max(200, baseDuration / levelBonus);

    const actionsPerHour = Math.floor((60 * 60 * 1000) / adjustedDuration);
    const experiencePerHour = actionsPerHour * 25; // Base XP per action

    return {
      duration: adjustedDuration,
      actionsPerHour,
      experiencePerHour,
    };
  }
}

/**
 * Probability and random calculation utilities
 */
export class ProbabilityCalculator implements ProbabilityCalculations {
  /**
   * Calculate success chance with various bonuses
   */
  public calculateSuccessChance(
    baseChance: number,
    levelBonus: number,
    toolBonus: number
  ): number {
    let totalChance = baseChance;
    totalChance += levelBonus;
    totalChance += toolBonus;

    // Cap between 5% and 95%
    return Math.max(0.05, Math.min(0.95, totalChance));
  }

  /**
   * Calculate critical hit chance
   */
  public calculateCriticalHitChance(baseChance: number, level: number): number {
    const levelBonus = level * 0.001; // 0.1% per level
    const totalChance = baseChance + levelBonus;

    // Cap at 25%
    return Math.min(0.25, totalChance);
  }

  /**
   * Calculate random reward with variance
   */
  public calculateRandomReward(baseReward: number, variance: number): number {
    const randomFactor = 1 + (Math.random() - 0.5) * variance;
    return Math.max(1, Math.floor(baseReward * randomFactor));
  }

  /**
   * Roll for a chance-based outcome
   */
  public rollForChance(chance: number): boolean {
    return Math.random() < chance;
  }

  /**
   * Calculate loot drop rates
   */
  public calculateLootDrop(
    baseDropRate: number,
    bonuses: {
      levelBonus?: number;
      toolBonus?: number;
      eventBonus?: number;
    } = {}
  ): {
    dropRate: number;
    guaranteedDrop?: boolean;
  } {
    let totalDropRate = baseDropRate;

    if (bonuses.levelBonus) totalDropRate += bonuses.levelBonus;
    if (bonuses.toolBonus) totalDropRate += bonuses.toolBonus;
    if (bonuses.eventBonus) totalDropRate += bonuses.eventBonus;

    // Check for guaranteed drop (100% chance)
    const guaranteedDrop = totalDropRate >= 1;

    return {
      dropRate: Math.min(1, totalDropRate),
      guaranteedDrop,
    };
  }

  /**
   * Generate random number with weighted probability
   */
  public weightedRandom(weights: number[]): number {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < weights.length; i++) {
      random -= weights[i]!;
      if (random <= 0) {
        return i;
      }
    }

    return weights.length - 1;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  public shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  }
}

/**
 * Stat calculation utilities
 */
export class StatCalculator implements StatCalculations {
  /**
   * Calculate combat level from combat stats
   */
  public calculateCombatLevel(stats: {
    attack: number;
    strength: number;
    defence: number;
    hitpoints: number;
    ranged: number;
    magic: number;
    prayer: number;
  }): number {
    const melee = Math.floor((stats.attack + stats.strength) / 2);
    const highest = Math.max(melee, stats.ranged, stats.magic * 1.5);
    const base = Math.floor((stats.defence + stats.hitpoints) / 2);
    const prayerBonus = Math.floor(stats.prayer / 2);

    return base + highest + prayerBonus;
  }

  /**
   * Calculate total level from all skills
   */
  public calculateTotalLevel(skills: Array<{ level: number }>): number {
    return skills.reduce((total, skill) => total + skill.level, 0);
  }

  /**
   * Calculate skill progress as percentage
   */
  public calculateSkillProgress(currentXP: number, level: number): number {
    if (level >= GAME_CONSTANTS.MAX_LEVEL) return 1;

    const expCalculator = new ExperienceCalculator();
    return expCalculator.getProgressToNextLevel(currentXP, level);
  }

  /**
   * Calculate equipment bonuses
   */
  public calculateEquipmentBonus(equipment: Array<{
    type: string;
    bonuses: Record<string, number>;
  }>): Record<string, number> {
    const totalBonuses: Record<string, number> = {};

    equipment.forEach(item => {
      Object.entries(item.bonuses).forEach(([stat, bonus]) => {
        totalBonuses[stat] = (totalBonuses[stat] || 0) + bonus;
      });
    });

    return totalBonuses;
  }

  /**
   * Calculate damage with combat formulas
   */
  public calculateDamage(
    strengthLevel: number,
    weaponBonus: number
  ): {
    minHit: number;
    maxHit: number;
    averageHit: number;
  } {
    const maxHit = Math.floor(
      ((strengthLevel * (weaponBonus + 64)) + 320) / 640
    );

    const minHit = Math.max(1, Math.floor(maxHit * 0.1));
    const averageHit = Math.floor((minHit + maxHit) / 2);

    return {
      minHit,
      maxHit,
      averageHit,
    };
  }

  /**
   * Calculate accuracy rating
   */
  public calculateAccuracy(
    attackLevel: number,
    attackBonus: number,
    defenceLevel: number,
    defenceBonus: number
  ): number {
    const attackRoll = attackLevel * (attackBonus + 64);
    const defenceRoll = defenceLevel * (defenceBonus + 64);

    if (attackRoll > defenceRoll) {
      return 1 - (defenceRoll + 2) / (2 * (attackRoll + 1));
    } else {
      return attackRoll / (2 * (defenceRoll + 1));
    }
  }
}

/**
 * Utility class for various game calculations
 */
export class GameUtils {
  private static experienceCalculator = new ExperienceCalculator();
  private static timeCalculator = new TimeCalculator();
  private static probabilityCalculator = new ProbabilityCalculator();
  private static statCalculator = new StatCalculator();

  /**
   * Get experience calculator instance
   */
  public static get experience(): ExperienceCalculator {
    return this.experienceCalculator;
  }

  /**
   * Get time calculator instance
   */
  public static get time(): TimeCalculator {
    return this.timeCalculator;
  }

  /**
   * Get probability calculator instance
   */
  public static get probability(): ProbabilityCalculator {
    return this.probabilityCalculator;
  }

  /**
   * Get stat calculator instance
   */
  public static get stats(): StatCalculator {
    return this.statCalculator;
  }

  /**
   * Format large numbers with abbreviations
   */
  public static formatNumber(num: number): string {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    if (num < 1000000000000) return (num / 1000000000).toFixed(1) + 'B';
    return (num / 1000000000000).toFixed(1) + 'T';
  }

  /**
   * Calculate percentage with proper rounding
   */
  public static calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Clamp a number between min and max values
   */
  public static clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Linear interpolation between two values
   */
  public static lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * Math.max(0, Math.min(1, factor));
  }

  /**
   * Generate unique ID
   */
  public static generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  /**
   * Deep clone an object
   */
  public static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as unknown as T;
    if (typeof obj === 'object') {
      const cloned = {} as T;
      Object.keys(obj).forEach(key => {
        (cloned as any)[key] = this.deepClone((obj as any)[key]);
      });
      return cloned;
    }
    return obj;
  }

  /**
   * Debounce function calls
   */
  public static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function calls
   */
  public static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}