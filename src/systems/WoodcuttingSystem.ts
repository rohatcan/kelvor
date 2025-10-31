/**
 * WoodcuttingSystem - Handles all woodcutting mechanics including tree chopping, tools, XP, and progression
 */
import { eventSystem } from '@/core/EventSystem';
import {
  WoodcuttingSkill,
  TreeType,
  ToolType,
  LogType,
  ActionReward,
  ActionRequirement,
  ActionResult,
  GAME_CONSTANTS,
} from '@/types';

export interface WoodcuttingConfig {
  trees: TreeType[];
  tools: ToolType[];
  logs: LogType[];
  baseChopTime: number;
  criticalHitChance: number;
  criticalHitMultiplier: number;
  staminaCostPerChop: number;
}

export class WoodcuttingSystem {
  private static instance: WoodcuttingSystem;
  private config: WoodcuttingConfig;

  private constructor() {
    this.config = this.initializeConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WoodcuttingSystem {
    if (!WoodcuttingSystem.instance) {
      WoodcuttingSystem.instance = new WoodcuttingSystem();
    }
    return WoodcuttingSystem.instance;
  }

  /**
   * Initialize woodcutting configuration
   */
  private initializeConfig(): WoodcuttingConfig {
    return {
      trees: [
        {
          id: 'tree_oak',
          name: 'Oak Tree',
          level: 1,
          experience: 25,
          respawnTime: 5000, // 5 seconds
          logType: { id: 'log_oak', name: 'Oak Logs', description: 'Basic oak logs', value: 10, icon: 'oak_log.png' },
          chopTime: 2000, // 2 seconds
          health: 10,
          icon: 'oak_tree.png',
          description: 'A common oak tree. Good for beginners.',
        },
        {
          id: 'tree_willow',
          name: 'Willow Tree',
          level: 5,
          experience: 45,
          respawnTime: 8000, // 8 seconds
          logType: { id: 'log_willow', name: 'Willow Logs', description: 'Flexible willow logs', value: 20, icon: 'willow_log.png' },
          chopTime: 3000, // 3 seconds
          health: 15,
          icon: 'willow_tree.png',
          description: 'A flexible willow tree. Requires level 5 woodcutting.',
        },
        {
          id: 'tree_maple',
          name: 'Maple Tree',
          level: 10,
          experience: 75,
          respawnTime: 12000, // 12 seconds
          logType: { id: 'log_maple', name: 'Maple Logs', description: 'Hard maple logs', value: 35, icon: 'maple_log.png' },
          chopTime: 4000, // 4 seconds
          health: 25,
          icon: 'maple_tree.png',
          description: 'A sturdy maple tree. Requires level 10 woodcutting.',
        },
        {
          id: 'tree_yew',
          name: 'Yew Tree',
          level: 20,
          experience: 125,
          respawnTime: 20000, // 20 seconds
          logType: { id: 'log_yew', name: 'Yew Logs', description: 'Precious yew logs', value: 60, icon: 'yew_log.png' },
          chopTime: 6000, // 6 seconds
          health: 40,
          icon: 'yew_tree.png',
          description: 'A rare yew tree. Requires level 20 woodcutting.',
        },
        {
          id: 'tree_magic',
          name: 'Magic Tree',
          level: 40,
          experience: 250,
          respawnTime: 45000, // 45 seconds
          logType: { id: 'log_magic', name: 'Magic Logs', description: 'Enchanted magic logs', value: 150, icon: 'magic_log.png' },
          chopTime: 10000, // 10 seconds
          health: 75,
          icon: 'magic_tree.png',
          description: 'A magical tree. Requires level 40 woodcutting.',
        },
      ],
      tools: [
        {
          id: 'tool_bronze_hatchet',
          name: 'Bronze Hatchet',
          level: 1,
          speed: 1.0,
          effectiveness: 0.9,
          durability: 100,
          maxDurability: 100,
          icon: 'bronze_hatchet.png',
          description: 'A basic bronze hatchet.',
          buyPrice: 10,
          sellPrice: 3,
        },
        {
          id: 'tool_iron_hatchet',
          name: 'Iron Hatchet',
          level: 5,
          speed: 1.1,
          effectiveness: 0.95,
          durability: 150,
          maxDurability: 150,
          icon: 'iron_hatchet.png',
          description: 'A sturdy iron hatchet.',
          buyPrice: 50,
          sellPrice: 15,
        },
        {
          id: 'tool_steel_hatchet',
          name: 'Steel Hatchet',
          level: 10,
          speed: 1.2,
          effectiveness: 1.0,
          durability: 200,
          maxDurability: 200,
          icon: 'steel_hatchet.png',
          description: 'A reliable steel hatchet.',
          buyPrice: 200,
          sellPrice: 60,
        },
        {
          id: 'tool_mithril_hatchet',
          name: 'Mithril Hatchet',
          level: 20,
          speed: 1.3,
          effectiveness: 1.05,
          durability: 300,
          maxDurability: 300,
          icon: 'mithril_hatchet.png',
          description: 'A lightweight mithril hatchet.',
          buyPrice: 1000,
          sellPrice: 300,
        },
        {
          id: 'tool_adamant_hatchet',
          name: 'Adamant Hatchet',
          level: 30,
          speed: 1.4,
          effectiveness: 1.1,
          durability: 400,
          maxDurability: 400,
          icon: 'adamant_hatchet.png',
          description: 'A powerful adamant hatchet.',
          buyPrice: 5000,
          sellPrice: 1500,
        },
        {
          id: 'tool_rune_hatchet',
          name: 'Rune Hatchet',
          level: 40,
          speed: 1.5,
          effectiveness: 1.15,
          durability: 500,
          maxDurability: 500,
          icon: 'rune_hatchet.png',
          description: 'An exceptional rune hatchet.',
          buyPrice: 20000,
          sellPrice: 6000,
        },
        {
          id: 'tool_dragon_hatchet',
          name: 'Dragon Hatchet',
          level: 60,
          speed: 1.7,
          effectiveness: 1.25,
          durability: 750,
          maxDurability: 750,
          icon: 'dragon_hatchet.png',
          description: 'A legendary dragon hatchet.',
          buyPrice: 100000,
          sellPrice: 30000,
        },
      ],
      logs: [], // Will be populated from tree definitions
      baseChopTime: GAME_CONSTANTS.BASE_ACTION_TIME,
      criticalHitChance: 0.05, // 5% base critical hit chance
      criticalHitMultiplier: 2.0, // Double rewards on critical hit
      staminaCostPerChop: 1,
    };

    // Populate logs from tree definitions
    // @ts-ignore - False positive unreachable code error
    this.config.logs = this.config.trees.map(tree => tree.logType);
  }

  /**
   * Get all available trees
   */
  public getTrees(): TreeType[] {
    return [...this.config.trees];
  }

  /**
   * Get trees available for a specific level
   */
  public getTreesForLevel(level: number): TreeType[] {
    return this.config.trees.filter(tree => tree.level <= level);
  }

  /**
   * Get tree by ID
   */
  public getTree(treeId: string): TreeType | undefined {
    return this.config.trees.find(tree => tree.id === treeId);
  }

  /**
   * Get all available tools
   */
  public getTools(): ToolType[] {
    return [...this.config.tools];
  }

  /**
   * Get tools available for a specific level
   */
  public getToolsForLevel(level: number): ToolType[] {
    return this.config.tools.filter(tool => tool.level <= level);
  }

  /**
   * Get tool by ID
   */
  public getTool(toolId: string): ToolType | undefined {
    return this.config.tools.find(tool => tool.id === toolId);
  }

  /**
   * Calculate chop time for a tree with current tool and skill level
   */
  public calculateChopTime(
    tree: TreeType,
    tool: ToolType | undefined,
    skillLevel: number
  ): number {
    let chopTime = tree.chopTime;

    // Apply tool speed bonus
    if (tool) {
      chopTime /= tool.speed;
    }

    // Apply skill level bonus (2% faster per level)
    const skillBonus = 1 + (skillLevel - 1) * 0.02;
    chopTime /= skillBonus;

    // Minimum chop time is 200ms
    return Math.max(200, Math.floor(chopTime));
  }

  /**
   * Calculate success chance for chopping a tree
   */
  public calculateSuccessChance(
    tree: TreeType,
    tool: ToolType | undefined,
    skillLevel: number
  ): number {
    let successChance = 0.5; // Base 50% success chance

    // Apply tool effectiveness
    if (tool) {
      successChance *= tool.effectiveness;
    }

    // Apply skill level bonus
    const levelBonus = Math.min(0.5, (skillLevel - tree.level) * 0.02);
    successChance += levelBonus;

    // Cap at 95% success chance
    return Math.min(0.95, Math.max(0.05, successChance));
  }

  /**
   * Calculate experience gained from chopping a tree
   */
  public calculateExperience(
    tree: TreeType,
    skillLevel: number,
    isCriticalHit: boolean = false
  ): number {
    let experience = tree.experience;

    // Apply level scaling (reduced XP for overlevel)
    const levelDiff = skillLevel - tree.level;
    if (levelDiff > 0) {
      const reduction = Math.min(0.5, levelDiff * 0.02);
      experience *= (1 - reduction);
    }

    // Apply critical hit bonus
    if (isCriticalHit) {
      experience *= this.config.criticalHitMultiplier;
    }

    return Math.floor(experience);
  }

  /**
   * Calculate log yield from chopping a tree
   */
  public calculateLogYield(
    tree: TreeType,
    tool: ToolType | undefined,
    skillLevel: number,
    isCriticalHit: boolean = false
  ): number {
    let baseYield = Math.floor(tree.health / 10) + 1; // Base yield based on tree health

    // Apply tool effectiveness bonus
    if (tool) {
      baseYield = Math.floor(baseYield * tool.effectiveness);
    }

    // Apply skill level bonus
    const levelBonus = Math.floor(skillLevel / 10); // +1 log per 10 levels
    baseYield += levelBonus;

    // Apply critical hit bonus
    if (isCriticalHit) {
      baseYield = Math.floor(baseYield * this.config.criticalHitMultiplier);
    }

    // Minimum yield is 1 log
    return Math.max(1, baseYield);
  }

  /**
   * Check if player can chop a specific tree
   */
  public canChopTree(
    skill: WoodcuttingSkill,
    treeId: string,
    toolId?: string
  ): { canChop: boolean; reason?: string } {
    const tree = this.getTree(treeId);
    if (!tree) {
      return { canChop: false, reason: 'Tree not found' };
    }

    // Check skill level requirement
    if (skill.level < tree.level) {
      return {
        canChop: false,
        reason: `Requires Woodcutting level ${tree.level}`
      };
    }

    // Check tool requirement
    if (toolId) {
      const tool = this.getTool(toolId);
      if (!tool) {
        return { canChop: false, reason: 'Tool not found' };
      }

      if (skill.level < tool.level) {
        return {
          canChop: false,
          reason: `Requires Woodcutting level ${tool.level} for this tool`
        };
      }

      // Check tool durability
      if (tool.durability <= 0) {
        return { canChop: false, reason: 'Tool is broken' };
      }
    }

    return { canChop: true };
  }

  /**
   * Perform tree chopping action
   */
  public async chopTree(
    skill: WoodcuttingSkill,
    treeId: string,
    toolId?: string
  ): Promise<ActionResult> {
    // Check if can chop
    const canChop = this.canChopTree(skill, treeId, toolId);
    if (!canChop.canChop) {
      return {
        success: false,
        rewards: [],
        experience: {},
        failureReason: canChop.reason,
      };
    }

    const tree = this.getTree(treeId)!;
    const tool = toolId ? this.getTool(toolId) : undefined;

    // Calculate success
    const successChance = this.calculateSuccessChance(tree, tool, skill.level);
    const isSuccess = Math.random() < successChance;

    if (!isSuccess) {
      return {
        success: false,
        rewards: [],
        experience: {},
        failureReason: 'Failed to chop the tree',
      };
    }

    // Calculate critical hit
    const criticalChance = this.config.criticalHitChance + (skill.level * 0.001); // +0.1% per level
    const isCriticalHit = Math.random() < criticalChance;

    // Calculate rewards
    const logYield = this.calculateLogYield(tree, tool, skill.level, isCriticalHit);
    const experience = this.calculateExperience(tree, skill.level, isCriticalHit);

    const rewards: ActionReward[] = [
      {
        type: 'item',
        value: tree.logType.id,
        amount: logYield,
      },
    ];

    // Sometimes give extra gold for rare trees
    if (tree.level >= 20 && Math.random() < 0.1) {
      rewards.push({
        type: 'gold',
        value: tree.level * 2,
        amount: 1,
      });
    }

    // Update tool durability
    if (tool) {
      tool.durability -= this.config.staminaCostPerChop;
      if (tool.durability <= 0) {
        tool.durability = 0;
        rewards.push({
          type: 'item',
          value: tool.id,
          amount: -1, // Remove broken tool
        });
      }
    }

    // Update skill statistics
    skill.totalLogsChopped += logYield;

    // Emit events
    eventSystem.emitWoodcuttingTreeChopped(treeId, logYield, experience);

    if (isCriticalHit) {
      eventSystem.emitUINotification({
        id: `critical_hit_${Date.now()}`,
        type: 'success',
        title: 'Critical Hit!',
        message: `Double rewards from chopping ${tree.name}!`,
        timestamp: Date.now(),
      });
    }

    return {
      success: true,
      rewards,
      experience: { woodcutting: experience },
      critBonus: isCriticalHit ? this.config.criticalHitMultiplier : undefined,
    };
  }

  /**
   * Buy a tool
   */
  public buyTool(toolId: string, playerGold: number): { success: boolean; cost?: number; reason?: string } {
    const tool = this.getTool(toolId);
    if (!tool) {
      return { success: false, reason: 'Tool not found' };
    }

    if (playerGold < tool.buyPrice) {
      return { success: false, reason: 'Not enough gold' };
    }

    return { success: true, cost: tool.buyPrice };
  }

  /**
   * Repair a tool
   */
  public repairTool(tool: ToolType, playerGold: number): { success: boolean; cost?: number; reason?: string } {
    if (tool.durability === tool.maxDurability) {
      return { success: false, reason: 'Tool is already at full durability' };
    }

    const repairCost = Math.floor(tool.buyPrice * 0.1); // 10% of buy price
    if (playerGold < repairCost) {
      return { success: false, reason: 'Not enough gold for repair' };
    }

    tool.durability = tool.maxDurability;
    return { success: true, cost: repairCost };
  }

  /**
   * Get requirements for a tree
   */
  public getTreeRequirements(treeId: string): ActionRequirement[] {
    const tree = this.getTree(treeId);
    if (!tree) return [];

    return [
      {
        type: 'skill',
        value: 'woodcutting',
        amount: tree.level,
      },
    ];
  }

  /**
   * Get requirements for a tool
   */
  public getToolRequirements(toolId: string): ActionRequirement[] {
    const tool = this.getTool(toolId);
    if (!tool) return [];

    return [
      {
        type: 'skill',
        value: 'woodcutting',
        amount: tool.level,
      },
      {
        type: 'gold',
        value: tool.buyPrice,
        amount: 1,
      },
    ];
  }

  /**
   * Calculate total woodcutting statistics
   */
  public calculateTotalStats(skill: WoodcuttingSkill): {
    totalLogsChopped: number;
    currentLevel: number;
    experienceToNext: number;
    progressToNext: number;
    treesUnlocked: number;
    toolsUnlocked: number;
  } {
    const progressToNext = skill.experience / skill.experienceToNext;
    const treesUnlocked = this.config.trees.filter(tree => tree.level <= skill.level).length;
    const toolsUnlocked = this.config.tools.filter(tool => tool.level <= skill.level).length;

    return {
      totalLogsChopped: skill.totalLogsChopped,
      currentLevel: skill.level,
      experienceToNext: skill.experienceToNext,
      progressToNext,
      treesUnlocked,
      toolsUnlocked,
    };
  }

  /**
   * Get next milestone rewards
   */
  public getNextMilestones(skillLevel: number): Array<{ level: number; reward: string }> {
    const milestones = [];

    // Tree unlock milestones
    const nextTree = this.config.trees.find(tree => tree.level > skillLevel);
    if (nextTree) {
      milestones.push({
        level: nextTree.level,
        reward: `Unlock ${nextTree.name}`,
      });
    }

    // Tool unlock milestones
    const nextTool = this.config.tools.find(tool => tool.level > skillLevel);
    if (nextTool) {
      milestones.push({
        level: nextTool.level,
        reward: `Unlock ${nextTool.name}`,
      });
    }

    // Level milestones
    const milestoneLevels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99];
    const nextMilestone = milestoneLevels.find(level => level > skillLevel);
    if (nextMilestone) {
      milestones.push({
        level: nextMilestone,
        reward: `Level ${nextMilestone} Milestone`,
      });
    }

    return milestones.sort((a, b) => a.level - b.level).slice(0, 3);
  }

  /**
   * Get configuration (for testing/debugging)
   */
  public getConfig(): WoodcuttingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (for testing/debugging)
   */
  public updateConfig(updates: Partial<WoodcuttingConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Export singleton instance
export const woodcuttingSystem = WoodcuttingSystem.getInstance();