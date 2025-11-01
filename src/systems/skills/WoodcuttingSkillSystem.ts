/**
 * WoodcuttingSkillSystem - Woodcutting implementation using the generic skill framework
 */
import { BaseSkillSystem, SkillConfig, SkillState } from './BaseSkillSystem';
import { SkillAction, ActionReward, ActionRequirement, GameEngine } from '@/types';
import { GameState } from '@/types';
import { WOODCUTTING_TREES, WOODCUTTING_TOOLS, WOODCUTTING_ACTIONS } from '@/data/WoodcuttingData';
import { eventSystem } from '@/core/EventSystem';

export interface WoodcuttingContext {
  treeId?: string;
  toolId?: string;
}

export interface WoodcuttingState {
  currentTool?: string;
  totalLogsChopped: number;
  treesChopped: Record<string, number>;
  toolsUnlocked: string[];
  toolDurability: Record<string, number>;
}

export class WoodcuttingSkillSystem extends BaseSkillSystem {
  private gameEngine: GameEngine;
  private woodcuttingState: WoodcuttingState;

  constructor(gameEngine: GameEngine) {
    const config: SkillConfig = {
      id: 'woodcutting',
      name: 'Woodcutting',
      description: 'Chop down trees to gather logs and gain experience',
      icon: '🪓',
      maxLevel: 99,
      experienceCurve: 'exponential',
      baseExperience: 100,
      experienceMultiplier: 1.1,
      actions: WOODCUTTING_ACTIONS,
      skillSpecificData: {
        trees: WOODCUTTING_TREES,
        tools: WOODCUTTING_TOOLS,
      },
    };

    super(config);
    this.gameEngine = gameEngine;
    this.woodcuttingState = this.createWoodcuttingState();
  }

  private createWoodcuttingState(): WoodcuttingState {
    return {
      totalLogsChopped: 0,
      treesChopped: {},
      toolsUnlocked: ['tool_bronze_hatchet'], // Start with basic tool
      toolDurability: {
        'tool_bronze_hatchet': 100,
      },
    };
  }

  protected createInitialState(): SkillState {
    const baseState = super.createInitialState();
    baseState.skillSpecificState = this.woodcuttingState;
    return baseState;
  }

  protected onInitialize(): void {
    // Initialize tool durability from unlocked tools
    this.woodcuttingState.toolsUnlocked.forEach(toolId => {
      if (!this.woodcuttingState.toolDurability[toolId]) {
        const tool = WOODCUTTING_TOOLS.find(t => t.id === toolId);
        if (tool) {
          this.woodcuttingState.toolDurability[toolId] = tool.maxDurability;
        }
      }
    });

    console.log('Woodcutting skill system initialized');
  }

  protected setupSkillSpecificEventListeners(): void {
    // Listen to woodcutting-specific events
    eventSystem.onGameEvent('woodcutting:tool_equipped', (event) => {
      this.equipTool(event.payload.toolId);
    });

    eventSystem.onGameEvent('woodcutting:tool_repaired', (event) => {
      this.repairTool(event.payload.toolId);
    });
  }

  protected getActionDurationModifier(action: SkillAction, context?: WoodcuttingContext): number {
    let modifier = 1.0;

    if (context?.toolId) {
      const tool = WOODCUTTING_TOOLS.find(t => t.id === context.toolId);
      if (tool) {
        modifier /= tool.speed;
      }
    }

    // Apply skill level bonus (2% faster per level)
    modifier /= (1 + (this.state.level - 1) * 0.02);

    return modifier;
  }

  protected getSuccessChanceModifier(action: SkillAction, context?: WoodcuttingContext): number {
    let modifier = 1.0;

    if (context?.toolId) {
      const tool = WOODCUTTING_TOOLS.find(t => t.id === context.toolId);
      if (tool) {
        modifier *= tool.effectiveness;
      }
    }

    // Apply skill level bonus (1% per level above requirement)
    const requiredLevel = this.getRequiredLevelForAction(action);
    const levelBonus = 1 + ((this.state.level - requiredLevel) * 0.01);
    modifier *= Math.max(1.0, levelBonus);

    return modifier;
  }

  protected getCriticalChanceModifier(action: SkillAction, context?: WoodcuttingContext): number {
    let modifier = 1.0;

    // Better tools provide higher critical chance
    if (context?.toolId) {
      const tool = WOODCUTTING_TOOLS.find(t => t.id === context.toolId);
      if (tool) {
        // Higher tier tools give better critical chance
        const toolBonus = 1 + (tool.level * 0.01);
        modifier *= toolBonus;
      }
    }

    return modifier;
  }

  protected modifyRewardAmount(
    reward: ActionReward,
    amount: number,
    context?: WoodcuttingContext,
    isCriticalHit?: boolean
  ): number {
    if (reward.type === 'item' && context?.treeId) {
      const tree = WOODCUTTING_TREES.find(t => t.id === context.treeId);
      if (tree) {
        // Base log yield from tree health
        let logYield = Math.floor(tree.health / 10) + 1;

        // Apply tool effectiveness bonus
        if (context?.toolId) {
          const tool = WOODCUTTING_TOOLS.find(t => t.id === context.toolId);
          if (tool) {
            logYield = Math.floor(logYield * tool.effectiveness);
          }
        }

        // Apply skill level bonus
        const levelBonus = Math.floor(this.state.level / 10);
        logYield += levelBonus;

        // Apply critical hit bonus
        if (isCriticalHit) {
          logYield = Math.floor(logYield * this.getCriticalMultiplier());
        }

        return Math.max(1, logYield);
      }
    }

    return amount;
  }

  protected applyActionEffects(
    action: SkillAction,
    context?: WoodcuttingContext,
    rewards: ActionReward[],
    isCriticalHit?: boolean
  ): void {
    if (context?.treeId) {
      // Update tree chopping statistics
      if (!this.woodcuttingState.treesChopped[context.treeId]) {
        this.woodcuttingState.treesChopped[context.treeId] = 0;
      }
      this.woodcuttingState.treesChopped[context.treeId]++;

      // Update total logs chopped
      const logRewards = rewards.filter(r => r.type === 'item');
      logRewards.forEach(reward => {
        this.woodcuttingState.totalLogsChopped += reward.amount || 0;
      });

      // Reduce tool durability
      if (context?.toolId) {
        this.reduceToolDurability(context.toolId, 1);
      }

      // Emit woodcutting-specific event
      const tree = WOODCUTTING_TREES.find(t => t.id === context.treeId);
      const logCount = logRewards.reduce((sum, r) => sum + (r.amount || 0), 0);
      const experience = this.calculateActionExperience(action, context, isCriticalHit)[this.config.id] || 0;

      eventSystem.emitWoodcuttingTreeChopped(context.treeId, logCount, experience);
    }

    // Handle gold rewards
    rewards.forEach(reward => {
      if (reward.type === 'gold') {
        this.gameEngine.addGold(reward.amount || 0);
      }
    });

    // Handle item rewards (add to inventory)
    rewards.forEach(reward => {
      if (reward.type === 'item') {
        // TODO: Add to inventory system
        console.log(`Added ${reward.amount}x ${reward.value} to inventory`);
      }
    });
  }

  protected calculateCustomExperience(level: number): number {
    // Woodcutting-specific experience curve
    return Math.floor(
      this.config.baseExperience *
      Math.pow(this.config.experienceMultiplier, level - 1) *
      (1 + level * 0.01) // Small bonus at higher levels
    );
  }

  protected onDestroy(): void {
    // Remove woodcutting-specific event listeners
    eventSystem.removeAllGameEventListeners('woodcutting:tool_equipped');
    eventSystem.removeAllGameEventListeners('woodcutting:tool_repaired');
  }

  // Resource checking methods
  protected hasItem(itemId: string, amount: number): boolean {
    // TODO: Implement inventory checking
    return true; // Placeholder
  }

  protected hasGold(amount: number): boolean {
    return this.gameEngine.getGameState().player.gold >= amount;
  }

  protected hasCompletedQuest(questId: string): boolean {
    // TODO: Implement quest checking
    return false; // Placeholder
  }

  // Woodcutting-specific methods

  public getTree(treeId: string) {
    return WOODCUTTING_TREES.find(tree => tree.id === treeId);
  }

  public getTreesForLevel(level: number) {
    return WOODCUTTING_TREES.filter(tree => tree.level <= level);
  }

  public getTool(toolId: string) {
    return WOODCUTTING_TOOLS.find(tool => tool.id === toolId);
  }

  public getToolsForLevel(level: number) {
    return WOODCUTTING_TOOLS.filter(tool => tool.level <= level);
  }

  public getCurrentTool() {
    if (this.woodcuttingState.currentTool) {
      return this.getTool(this.woodcuttingState.currentTool);
    }
    return null;
  }

  public equipTool(toolId: string): boolean {
    const tool = this.getTool(toolId);
    if (!tool) {
      return false;
    }

    if (tool.level > this.state.level) {
      return false; // Level requirement not met
    }

    if (!this.woodcuttingState.toolsUnlocked.includes(toolId)) {
      return false; // Tool not unlocked
    }

    if (this.woodcuttingState.toolDurability[toolId] <= 0) {
      return false; // Tool is broken
    }

    this.woodcuttingState.currentTool = toolId;
    eventSystem.emitWoodcuttingToolEquipped(toolId);
    return true;
  }

  public unlockTool(toolId: string): boolean {
    const tool = this.getTool(toolId);
    if (!tool) {
      return false;
    }

    if (this.woodcuttingState.toolsUnlocked.includes(toolId)) {
      return true; // Already unlocked
    }

    if (tool.level > this.state.level) {
      return false; // Level requirement not met
    }

    const cost = tool.buyPrice;
    if (!this.gameEngine.removeGold(cost)) {
      return false; // Not enough gold
    }

    this.woodcuttingState.toolsUnlocked.push(toolId);
    this.woodcuttingState.toolDurability[toolId] = tool.maxDurability;

    // Auto-equip if no current tool
    if (!this.woodcuttingState.currentTool) {
      this.equipTool(toolId);
    }

    return true;
  }

  public repairTool(toolId: string): boolean {
    const tool = this.getTool(toolId);
    if (!tool) {
      return false;
    }

    if (!this.woodcuttingState.toolsUnlocked.includes(toolId)) {
      return false;
    }

    if (this.woodcuttingState.toolDurability[toolId] === tool.maxDurability) {
      return true; // Already at full durability
    }

    const repairCost = Math.floor(tool.buyPrice * 0.1); // 10% of buy price
    if (!this.gameEngine.removeGold(repairCost)) {
      return false; // Not enough gold
    }

    this.woodcuttingState.toolDurability[toolId] = tool.maxDurability;
    return true;
  }

  private reduceToolDurability(toolId: string, amount: number): void {
    if (!this.woodcuttingState.toolDurability[toolId]) {
      return;
    }

    this.woodcuttingState.toolDurability[toolId] -= amount;

    if (this.woodcuttingState.toolDurability[toolId] <= 0) {
      this.woodcuttingState.toolDurability[toolId] = 0;

      // Switch to another available tool if current tool broke
      if (this.woodcuttingState.currentTool === toolId) {
        this.findAndEquipBestTool();
      }
    }
  }

  private findAndEquipBestTool(): void {
    // Find the best available tool that's not broken
    const availableTools = this.woodcuttingState.toolsUnlocked
      .filter(toolId => this.woodcuttingState.toolDurability[toolId] > 0)
      .map(toolId => this.getTool(toolId))
      .filter(tool => tool !== undefined)
      .sort((a, b) => b.level - a.level); // Sort by level (best first)

    if (availableTools.length > 0) {
      this.equipTool(availableTools[0].id);
    } else {
      this.woodcuttingState.currentTool = undefined;
    }
  }

  public getWoodcuttingStatistics() {
    return {
      ...this.getStatistics(),
      totalLogsChopped: this.woodcuttingState.totalLogsChopped,
      treesChopped: { ...this.woodcuttingState.treesChopped },
      toolsUnlocked: this.woodcuttingState.toolsUnlocked.length,
      currentTool: this.getCurrentTool()?.name || 'None',
      toolDurability: { ...this.woodcuttingState.toolDurability },
    };
  }

  public getToolDurability(toolId: string): number {
    return this.woodcuttingState.toolDurability[toolId] || 0;
  }

  public getUnlockedTools() {
    return this.woodcuttingState.toolsUnlocked
      .map(toolId => this.getTool(toolId))
      .filter(tool => tool !== undefined);
  }

  public getAvailableTrees() {
    return this.getTreesForLevel(this.state.level);
  }

  public canChopTree(treeId: string): { canChop: boolean; reason?: string } {
    const tree = this.getTree(treeId);
    if (!tree) {
      return { canChop: false, reason: 'Tree not found' };
    }

    if (tree.level > this.state.level) {
      return { canChop: false, reason: `Requires Woodcutting level ${tree.level}` };
    }

    const currentTool = this.getCurrentTool();
    if (!currentTool) {
      return { canChop: false, reason: 'No tool equipped' };
    }

    if (this.woodcuttingState.toolDurability[currentTool.id] <= 0) {
      return { canChop: false, reason: 'Tool is broken' };
    }

    return { canChop: true };
  }

  public async chopTree(treeId: string): Promise<any> {
    const canChop = this.canChopTree(treeId);
    if (!canChop.canChop) {
      return {
        success: false,
        failureReason: canChop.reason,
      };
    }

    const actionId = `chop_${treeId.replace('tree_', '')}`;
    const context: WoodcuttingContext = {
      treeId,
      toolId: this.woodcuttingState.currentTool,
    };

    return await this.performAction(actionId, context);
  }

  // Override save/load methods to include woodcutting-specific state
  public saveState(): any {
    const baseSave = super.saveState();
    return {
      ...baseSave,
      woodcuttingState: this.woodcuttingState,
    };
  }

  public loadState(data: any): void {
    super.loadState(data);
    if (data.woodcuttingState) {
      this.woodcuttingState = { ...this.woodcuttingState, ...data.woodcuttingState };
      this.state.skillSpecificState = this.woodcuttingState;
    }
  }

  public reset(): void {
    super.reset();
    this.woodcuttingState = this.createWoodcuttingState();
    this.state.skillSpecificState = this.woodcuttingState;
  }
}