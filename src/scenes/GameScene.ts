/**
 * Main game scene - handles the core gameplay with game engine integration
 */
import { Scene } from 'phaser';
import { GameEngine } from '@/core/GameEngine';
import { eventSystem } from '@/core/EventSystem';
import { woodcuttingSystem } from '@/systems/WoodcuttingSystem';
import { GameUtils } from '@/utils/GameCalculations';
import { Player, GameState, WoodcuttingSkill } from '@/types';

export class GameScene extends Scene {
  private gameEngine!: GameEngine;
  private gameState!: GameState;
  private player!: Player;
  private woodcuttingSkill!: WoodcuttingSkill;

  // UI Elements
  private uiElements: {
    healthBar?: Phaser.GameObjects.Rectangle;
    healthBarBg?: Phaser.GameObjects.Rectangle;
    expBar?: Phaser.GameObjects.Rectangle;
    expBarBg?: Phaser.GameObjects.Rectangle;
    playerText?: Phaser.GameObjects.Text;
    goldText?: Phaser.GameObjects.Text;
    woodcuttingText?: Phaser.GameObjects.Text;
    notifications: Phaser.GameObjects.Text[];
  } = {
    notifications: [],
  };

  // Game objects
  private trees: Map<string, Phaser.GameObjects.GameObject> = new Map();
  private playerSprite?: Phaser.GameObjects.GameObject;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Load game assets
    this.load.setBaseURL('assets/');

    // Create placeholder assets if not loaded
    this.createPlaceholderAssets();
  }

  create(): void {
    // Initialize game engine
    this.initializeGameEngine();

    // Load or create game state
    this.loadOrCreateGameState();

    // Create game world
    this.createGameWorld();

    // Create UI
    this.createUI();

    // Set up event listeners
    this.setupEventListeners();

    // Start the game engine
    this.gameEngine.start();

    console.log('Game scene initialized');
  }

  override update(): void {
    if (!this.gameEngine.isActive()) return;

    // Update game logic
    this.updateGame();
    this.updateUI();
  }

  private initializeGameEngine(): void {
    this.gameEngine = new GameEngine();
  }

  private async loadOrCreateGameState(): Promise<void> {
    try {
      // Try to load existing game
      const loadSuccess = await this.gameEngine.loadGame();

      if (loadSuccess) {
        this.gameState = this.gameEngine.getGameState() as GameState;
        console.log('Game loaded successfully');
      } else {
        // Create new game state
        this.gameState = this.gameEngine.getGameState() as GameState;
        console.log('New game created');
      }

      this.player = this.gameState.player;
      this.woodcuttingSkill = this.gameState.woodcutting;
    } catch (error) {
      console.error('Failed to load/create game state:', error);
      // Fallback to new game
      this.gameState = this.gameEngine.getGameState() as GameState;
      this.player = this.gameState.player;
      this.woodcuttingSkill = this.gameState.woodcutting;
    }
  }

  private createPlaceholderAssets(): void {
    // Create simple colored rectangles as placeholders for missing assets
    const graphics = this.add.graphics();

    // Create tree placeholder
    graphics.fillStyle(0x228B22);
    graphics.fillRect(0, 0, 40, 60);
    graphics.generateTexture('tree_placeholder', 40, 60);

    // Create player placeholder
    graphics.clear();
    graphics.fillStyle(0xFF6B6B);
    graphics.fillRect(0, 0, 30, 40);
    graphics.generateTexture('player_placeholder', 30, 40);

    // Create tool placeholder
    graphics.clear();
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(0, 0, 20, 8);
    graphics.generateTexture('hatchet_placeholder', 20, 8);

    graphics.destroy();
  }

  private createGameWorld(): void {
    const { width, height } = this.cameras.main;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x87CEEB);

    // Ground
    this.add.rectangle(width / 2, height - 50, width, 100, 0x8B4513);

    // Create trees based on player's woodcutting level
    this.createTrees();

    // Create player character
    this.createPlayer();

    // Create woodcutting area
    this.createWoodcuttingArea();
  }

  private createTrees(): void {
    const availableTrees = woodcuttingSystem.getTreesForLevel(this.woodcuttingSkill.level);
    const treeSpacing = 120;
    const startX = 150;
    const groundY = this.cameras.main.height - 100;

    availableTrees.slice(0, 5).forEach((treeData, index) => {
      const x = startX + (index * treeSpacing);
      const tree = this.add.rectangle(x, groundY, 40, 60, 0x228B22)
        .setOrigin(0.5)
        .setInteractive();

      // Add tree label
      this.add.text(x, groundY + 40, treeData.name, {
        fontSize: '12px',
        color: '#FFFFFF',
      }).setOrigin(0.5);

      // Store tree reference
      this.trees.set(treeData.id, tree);

      // Add click handler
      tree.on('pointerdown', () => {
        this.chopTree(treeData.id);
      });

      // Add hover effects
      tree.on('pointerover', () => {
        tree.setFillStyle(0x32CD32);
        this.showTooltip(`${treeData.name}\nLevel: ${treeData.level}\nXP: ${treeData.experience}`);
      });

      tree.on('pointerout', () => {
        tree.setFillStyle(0x228B22);
        this.hideTooltip();
      });
    });
  }

  private createPlayer(): void {
    const { x, y } = this.player.position;

    this.playerSprite = this.add.rectangle(x, y, 30, 40, 0xFF6B6B)
      .setOrigin(0.5)
      .setInteractive();

    // Add player animation when performing actions
    this.tweens.add({
      targets: this.playerSprite,
      scaleX: 1.1,
      scaleY: 0.9,
      duration: 200,
      yoyo: true,
      repeat: -1,
      paused: true,
    });
  }

  private createWoodcuttingArea(): void {
    const { width } = this.cameras.main;

    // Woodcutting panel background
    this.add.rectangle(width / 2, 120, width - 40, 200, 0x2C3E50)
      .setOrigin(0.5)
      .setAlpha(0.9);

    // Title
    this.add.text(width / 2, 40, 'Woodcutting', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Current tool info
    const currentTool = this.woodcuttingSkill.currentTool
      ? woodcuttingSystem.getTool(this.woodcuttingSkill.currentTool.id)
      : null;

    const toolText = currentTool
      ? `Tool: ${currentTool.name} (Durability: ${currentTool.durability}/${currentTool.maxDurability})`
      : 'No tool equipped';

    this.add.text(width / 2, 80, toolText, {
      fontSize: '14px',
      color: '#FFD700',
    }).setOrigin(0.5);

    // Available tools
    const availableTools = woodcuttingSystem.getToolsForLevel(this.woodcuttingSkill.level);
    this.add.text(width / 2, 110, `Available Tools: ${availableTools.length}`, {
      fontSize: '12px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
  }

  private createUI(): void {
    const { width, height } = this.cameras.main;

    // Health bar
    this.uiElements.healthBarBg = this.add.rectangle(100, 30, 200, 20, 0x333333).setOrigin(0);
    this.uiElements.healthBar = this.add.rectangle(100, 30, 200, 20, 0xFF0000).setOrigin(0);

    // Player info
    this.uiElements.playerText = this.add.text(10, 10, '', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });

    // Gold display
    this.uiElements.goldText = this.add.text(10, 50, '', {
      fontSize: '16px',
      color: '#FFD700',
    });

    // Experience bar
    this.uiElements.expBarBg = this.add.rectangle(width - 210, 30, 200, 20, 0x333333).setOrigin(0);
    this.uiElements.expBar = this.add.rectangle(width - 210, 30, 0, 20, 0x00FF00).setOrigin(0);

    // Woodcutting info
    this.uiElements.woodcuttingText = this.add.text(10, 80, '', {
      fontSize: '14px',
      color: '#90EE90',
    });

    // Settings button
    const settingsButton = this.add.text(width - 100, height - 30, 'Settings', {
      fontSize: '14px',
      color: '#FFFFFF',
      backgroundColor: '#3498db',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    settingsButton.on('pointerdown', () => {
      this.openSettings();
    });

    // Save button
    const saveButton = this.add.text(width - 200, height - 30, 'Save', {
      fontSize: '14px',
      color: '#FFFFFF',
      backgroundColor: '#27ae60',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    saveButton.on('pointerdown', () => {
      this.manualSave();
    });
  }

  private setupEventListeners(): void {
    // Listen to game events
    eventSystem.onGameEvent('skill:level_up', () => {
      this.showNotification('Level up! Congratulations!', 'success');
    });

    eventSystem.onGameEvent('player:gold_changed', () => {
      this.updateGoldDisplay();
    });

    eventSystem.onGameEvent('player:experience_gained', () => {
      this.updateExperienceDisplay();
    });

    eventSystem.onGameEvent('woodcutting:tree_chopped', () => {
      this.showNotification('Tree chopped successfully!', 'success');
    });

    eventSystem.onGameEvent('ui:notification', () => {
      this.showNotification('New notification!', 'info');
    });

    eventSystem.onGameEvent('action:started', () => {
      this.showNotification('Started chopping...', 'info');
    });
  }

  private async chopTree(treeId: string): Promise<void> {
    if (!this.woodcuttingSkill.currentTool) {
      this.showNotification('You need to equip a tool first!', 'warning');
      return;
    }

    // Check if can chop
    const canChop = woodcuttingSystem.canChopTree(this.woodcuttingSkill, treeId, this.woodcuttingSkill.currentTool!.id);
    if (!canChop.canChop) {
      this.showNotification(canChop.reason || 'Cannot chop this tree', 'warning');
      return;
    }

    // Start chopping animation
    this.startChoppingAnimation();

    // Perform chop action
    const result = await woodcuttingSystem.chopTree(this.woodcuttingSkill, treeId, this.woodcuttingSkill.currentTool!.id);

    // Stop animation
    this.stopChoppingAnimation();

    if (result.success) {
      // Process rewards
      this.processRewards(result);
    } else {
      this.showNotification(result.failureReason || 'Failed to chop tree', 'error');
    }

    // Update displays
    this.updateUI();
  }

  private startChoppingAnimation(): void {
    if (this.playerSprite) {
      this.tweens.getTweensOf(this.playerSprite).forEach(tween => {
        tween.play();
      });
    }
  }

  private stopChoppingAnimation(): void {
    if (this.playerSprite) {
      this.tweens.getTweensOf(this.playerSprite).forEach(tween => {
        tween.pause();
      });
    }
  }

  private processRewards(result: any): void {
    result.rewards.forEach((reward: any) => {
      switch (reward.type) {
        case 'experience':
          // Experience is handled by the woodcutting system
          break;
        case 'item':
          // Add to inventory (placeholder for now)
          console.log(`Added ${reward.amount}x ${reward.value} to inventory`);
          break;
        case 'gold':
          this.gameEngine.addGold(reward.amount);
          break;
      }
    });
  }

  private updateGame(): void {
    // Game engine handles most updates
    // Add any scene-specific game logic here
  }

  private updateUI(): void {
    this.updatePlayerDisplay();
    this.updateGoldDisplay();
    this.updateExperienceDisplay();
    this.updateWoodcuttingDisplay();
  }

  private updatePlayerDisplay(): void {
    if (this.uiElements.playerText) {
      this.uiElements.playerText.setText(`${this.player.name} - Level ${this.player.level}`);
    }
  }

  private updateGoldDisplay(): void {
    if (this.uiElements.goldText) {
      this.uiElements.goldText.setText(`Gold: ${GameUtils.formatNumber(this.player.gold)}`);
    }
  }

  private updateExperienceDisplay(): void {
    if (this.uiElements.expBar && this.uiElements.expBarBg) {
      const progress = GameUtils.experience.getProgressToNextLevel(this.player.experience, this.player.level);
      const barWidth = this.uiElements.expBarBg.width * progress;
      this.uiElements.expBar.width = barWidth;
    }
  }

  private updateWoodcuttingDisplay(): void {
    if (this.uiElements.woodcuttingText) {
      const stats = woodcuttingSystem.calculateTotalStats(this.woodcuttingSkill);
      this.uiElements.woodcuttingText.setText(
        `Woodcutting: Level ${stats.currentLevel} (${Math.floor(stats.progressToNext * 100)}%)\n` +
        `Logs Chopped: ${GameUtils.formatNumber(stats.totalLogsChopped)}`
      );
    }
  }

  private showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const { width } = this.cameras.main;
    const colors = {
      info: '#3498db',
      success: '#27ae60',
      warning: '#f39c12',
      error: '#e74c3c',
    };

    const notification = this.add.text(width / 2, 200, message, {
      fontSize: '14px',
      color: '#FFFFFF',
      backgroundColor: colors[type],
      padding: { x: 15, y: 8 },
      wordWrap: { width: 300 },
    }).setOrigin(0.5);

    this.uiElements.notifications.push(notification);

    // Auto-remove after 3 seconds
    this.time.delayedCall(3000, () => {
      notification.destroy();
      const index = this.uiElements.notifications.indexOf(notification);
      if (index > -1) {
        this.uiElements.notifications.splice(index, 1);
      }
    });
  }

  private showTooltip(text: string): void {
    // Simple tooltip implementation
    // In a real game, you'd want a more sophisticated tooltip system
    const tooltip = this.add.text(this.input.x, this.input.y - 30, text, {
      fontSize: '12px',
      color: '#FFFFFF',
      backgroundColor: '#000000',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1);

    // Remove on mouse move
    this.input.on('pointermove', () => {
      tooltip.destroy();
    });
  }

  private hideTooltip(): void {
    // Tooltip cleanup handled by showTooltip
  }

  private openSettings(): void {
    // Placeholder for settings modal
    this.showNotification('Settings menu coming soon!', 'info');
  }

  private async manualSave(): Promise<void> {
    await this.gameEngine.saveGame();
    this.showNotification('Game saved successfully!', 'success');
  }

  public shutdown(): void {
    // Clean up when scene is destroyed
    this.gameEngine?.stop();
    eventSystem.removeAllListeners();
    this.uiElements.notifications.forEach(notification => notification.destroy());
  }
}