/**
 * Skill UI System - Generic UI components for skills
 * Provides reusable UI elements that work with any skill system
 */
import { Scene } from 'phaser';
import { Panel, TextButton, ProgressBar, UIComponent } from '@/components/UIComponent';
import { eventSystem } from '@/core/EventSystem';
import { skillRegistry } from './SkillRegistry';
import { BaseSkillSystem } from './BaseSkillSystem';
import { SkillRegistration, SkillDetails } from './SkillRegistry';
import { SkillAction, ActionReward } from '@/types';

export interface SkillUIConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  showLocked: boolean;
  showProgress: boolean;
  compactMode: boolean;
}

export interface SkillPanelConfig extends SkillUIConfig {
  skillId: string;
  showActions: boolean;
  showStatistics: boolean;
}

/**
 * Generic Skill Panel - Shows skill info, progress, and actions
 */
export class SkillPanel extends UIComponent {
  private skillSystem?: BaseSkillSystem;
  private registration?: SkillRegistration;
  private background?: Panel;
  private headerText?: Phaser.GameObjects.Text;
  private levelText?: Phaser.GameObjects.Text;
  private progressBar?: ProgressBar;
  private actionButtons: TextButton[] = [];
  private statisticsText?: Phaser.GameObjects.Text;
  private config: SkillPanelConfig;

  constructor(scene: Scene, config: SkillPanelConfig) {
    super(scene, config);
    this.config = config;
  }

  protected create(): void {
    // Get skill system
    this.registration = skillRegistry.getSkillRegistration(this.config.skillId);
    if (!this.registration) {
      console.warn(`Skill not found: ${this.config.skillId}`);
      return;
    }
    this.skillSystem = this.registration.system;

    // Create container
    this.container = this.scene.add.container(this.x, this.y);

    // Create background
    this.background = new Panel(this.scene, {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      backgroundColor: 0x2C3E50,
      borderColor: 0x34495E,
      borderWidth: 2,
    });
    this.addChild(this.background.getContainer()!);

    // Create skill header
    this.createHeader();

    // Create progress bar
    if (this.config.showProgress) {
      this.createProgressBar();
    }

    // Create action buttons
    if (this.config.showActions) {
      this.createActionButtons();
    }

    // Create statistics
    if (this.config.showStatistics) {
      this.createStatistics();
    }

    // Set up event listeners
    this.setupEventListeners();

    // Update display
    this.updateDisplay();
  }

  private createHeader(): void {
    if (!this.registration) return;

    // Skill name and icon
    this.headerText = this.scene.add.text(
      -this.width / 2 + 20,
      -this.height / 2 + 20,
      `${this.registration.details.icon} ${this.registration.details.name}`,
      {
        fontSize: '18px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }
    ).setOrigin(0, 0.5);
    this.addChild(this.headerText);

    // Skill level
    this.levelText = this.scene.add.text(
      this.width / 2 - 20,
      -this.height / 2 + 20,
      'Lv. 1',
      {
        fontSize: '16px',
        color: '#FFD700',
        fontStyle: 'bold',
      }
    ).setOrigin(1, 0.5);
    this.addChild(this.levelText);

    // Skill description
    const descriptionText = this.scene.add.text(
      -this.width / 2 + 20,
      -this.height / 2 + 50,
      this.registration.details.description,
      {
        fontSize: '12px',
        color: '#CCCCCC',
        wordWrap: { width: this.width - 40 },
      }
    ).setOrigin(0, 0.5);
    this.addChild(descriptionText);
  }

  private createProgressBar(): void {
    if (!this.skillSystem) return;

    this.progressBar = new ProgressBar(this.scene, {
      x: 0,
      y: -this.height / 2 + 80,
      width: this.width - 40,
      height: 20,
      backgroundColor: 0x34495E,
      fillColor: 0x2ECC71,
      showText: true,
      textColor: '#FFFFFF',
    });
    this.addChild(this.progressBar.getContainer()!);
  }

  private createActionButtons(): void {
    if (!this.skillSystem) return;

    const availableActions = this.skillSystem.getPerformableActions();
    const buttonY = -this.height / 2 + 120;
    const buttonHeight = 30;
    const buttonSpacing = 35;

    availableActions.slice(0, 5).forEach((action, index) => {
      const button = new TextButton(this.scene, {
        x: 0,
        y: buttonY + (index * buttonSpacing),
        width: this.width - 40,
        height: buttonHeight,
        text: action.name,
        fontSize: 12,
        backgroundColor: 0x3498db,
        hoverColor: 0x5dade2,
        pressedColor: 0x2980b9,
        onPressed: () => this.performAction(action.id),
      });
      this.addChild(button.getContainer()!);
      this.actionButtons.push(button);
    });

    // Add tooltip for action requirements
    this.actionButtons.forEach((button, index) => {
      const action = availableActions[index];
      if (action.requirements.length > 0) {
        const container = button.getContainer()!;
        container.setInteractive();
        container.on('pointerover', () => {
          this.showActionTooltip(action, container);
        });
        container.on('pointerout', () => {
          this.hideActionTooltip();
        });
      }
    });
  }

  private createStatistics(): void {
    if (!this.skillSystem) return;

    const stats = this.skillSystem.getStatistics();
    const statsY = this.height / 2 - 60;

    this.statisticsText = this.scene.add.text(
      -this.width / 2 + 20,
      statsY,
      `Actions: ${stats.actionsCompleted} | Time: ${Math.floor(stats.timeSpent / 1000)}s`,
      {
        fontSize: '11px',
        color: '#AAAAAA',
      }
    ).setOrigin(0, 0.5);
    this.addChild(this.statisticsText);
  }

  private setupEventListeners(): void {
    if (!this.skillSystem) return;

    // Listen to skill level ups
    eventSystem.onGameEvent('skill:level_up', (event) => {
      if (event.payload.skillId === this.config.skillId) {
        this.updateDisplay();
      }
    });

    // Listen to experience gains
    eventSystem.onGameEvent('player:experience_gained', (event) => {
      if (event.payload.skillId === this.config.skillId) {
        this.updateProgress();
      }
    });

    // Listen to action completions
    eventSystem.onGameEvent('action:completed', (event) => {
      if (event.payload.actionId.startsWith(`${this.config.skillId}:`)) {
        this.updateStatistics();
      }
    });
  }

  private updateDisplay(): void {
    if (!this.skillSystem) return;

    const state = this.skillSystem.getState();

    // Update level text
    if (this.levelText) {
      this.levelText.setText(`Lv. ${state.level}`);
    }

    // Update progress bar
    this.updateProgress();

    // Update action buttons
    this.updateActionButtons();

    // Update statistics
    this.updateStatistics();
  }

  private updateProgress(): void {
    if (!this.skillSystem || !this.progressBar) return;

    const progress = this.skillSystem.getProgressToNext();
    this.progressBar.setProgress(progress);
  }

  private updateActionButtons(): void {
    if (!this.skillSystem) return;

    // Remove old buttons
    this.actionButtons.forEach(button => button.destroy());
    this.actionButtons = [];

    // Recreate with current available actions
    this.createActionButtons();
  }

  private updateStatistics(): void {
    if (!this.skillSystem || !this.statisticsText) return;

    const stats = this.skillSystem.getStatistics();
    this.statisticsText.setText(
      `Actions: ${stats.actionsCompleted} | Time: ${Math.floor(stats.timeSpent / 1000)}s`
    );
  }

  private async performAction(actionId: string): Promise<void> {
    if (!this.skillSystem) return;

    try {
      const result = await this.skillSystem.performAction(actionId);
      if (result.success) {
        // Success is handled by the skill system events
      } else {
        eventSystem.emitUINotification({
          id: `action_failed_${Date.now()}`,
          type: 'error',
          title: 'Action Failed',
          message: result.failureReason || 'Unknown error',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error performing action:', error);
    }
  }

  private showActionTooltip(action: SkillAction, target: Phaser.GameObjects.Container): void {
    const requirements = action.requirements.map(req => {
      switch (req.type) {
        case 'skill':
          return `${req.value} Lv. ${req.amount}`;
        case 'level':
          return `Player Lv. ${req.amount}`;
        case 'item':
          return `${req.amount}x ${req.value}`;
        case 'gold':
          return `${req.amount} Gold`;
        default:
          return `${req.type}: ${req.amount}`;
      }
    }).join(', ');

    const rewards = action.rewards.map(req => {
      const amount = req.chance ? `${req.amount} (${Math.round(req.chance * 100)}%)` : req.amount;
      return `${amount}x ${req.value}`;
    }).join(', ');

    const tooltipText = `${action.name}\n\nRequirements: ${requirements || 'None'}\nRewards: ${rewards || 'None'}`;

    // Create tooltip (simple implementation)
    const tooltip = this.scene.add.text(
      target.x + target.width / 2,
      target.y - target.height / 2,
      tooltipText,
      {
        fontSize: '11px',
        color: '#FFFFFF',
        backgroundColor: '#000000',
        padding: { x: 8, y: 6 },
        wordWrap: { width: 200 },
      }
    ).setOrigin(0, 1);

    this.addChild(tooltip);

    // Store reference for cleanup
    (tooltip as any).isTooltip = true;
  }

  private hideActionTooltip(): void {
    // Remove tooltips
    this.children = this.children.filter(child => {
      if ((child as any).isTooltip) {
        child.destroy();
        return false;
      }
      return true;
    });
  }

  public destroy(): void {
    this.actionButtons.forEach(button => button.destroy());
    super.destroy();
  }
}

/**
 * Skill Overview Panel - Shows all skills in a grid layout
 */
export class SkillOverviewPanel extends UIComponent {
  private skillPanels: SkillPanel[] = [];
  private config: SkillUIConfig;
  private background?: Panel;
  private headerText?: Phaser.GameObjects.Text;

  constructor(scene: Scene, config: SkillUIConfig) {
    super(scene, config);
    this.config = config;
  }

  protected create(): void {
    // Create container
    this.container = this.scene.add.container(this.x, this.y);

    // Create background
    this.background = new Panel(this.scene, {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      backgroundColor: 0x1A252F,
      borderColor: 0x2C3E50,
      borderWidth: 3,
    });
    this.addChild(this.background.getContainer()!);

    // Create header
    this.createHeader();

    // Create skill panels
    this.createSkillPanels();

    // Set up event listeners
    this.setupEventListeners();
  }

  private createHeader(): void {
    this.headerText = this.scene.add.text(
      0,
      -this.height / 2 + 30,
      'Skills Overview',
      {
        fontSize: '24px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);
    this.addChild(this.headerText);
  }

  private createSkillPanels(): void {
    const skills = skillRegistry.getUnlockedSkills();
    if (!this.config.showLocked) {
      skills.push(...skillRegistry.getLockedSkills());
    }

    const panelWidth = 200;
    const panelHeight = this.config.compactMode ? 150 : 250;
    const padding = 20;
    const columns = Math.floor((this.width - padding * 2) / (panelWidth + padding));

    skills.forEach((registration, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = -this.width / 2 + padding + (column * (panelWidth + padding)) + panelWidth / 2;
      const y = -this.height / 2 + 80 + (row * (panelHeight + padding)) + panelHeight / 2;

      const panel = new SkillPanel(this.scene, {
        x,
        y,
        width: panelWidth,
        height: panelHeight,
        skillId: registration.id,
        showLocked: true,
        showProgress: true,
        compactMode: this.config.compactMode,
        showActions: !this.config.compactMode,
        showStatistics: !this.config.compactMode,
      });

      this.addChild(panel.getContainer()!);
      this.skillPanels.push(panel);
    });
  }

  private setupEventListeners(): void {
    // Listen to skill unlocks
    eventSystem.onGameEvent('skill:unlocked', () => {
      this.refreshSkillPanels();
    });

    // Listen to level ups
    eventSystem.onGameEvent('skill:level_up', () => {
      // All panels will update themselves via their own listeners
    });
  }

  private refreshSkillPanels(): void {
    // Remove existing panels
    this.skillPanels.forEach(panel => panel.destroy());
    this.skillPanels = [];

    // Recreate panels
    this.createSkillPanels();
  }

  public updateSkillPanels(): void {
    this.skillPanels.forEach(panel => {
      (panel as any).updateDisplay?.();
    });
  }

  public destroy(): void {
    this.skillPanels.forEach(panel => panel.destroy());
    super.destroy();
  }
}

/**
 * Skill Action Button - A specialized button for skill actions
 */
export class SkillActionButton extends TextButton {
  private action: SkillAction;
  private skillSystem: BaseSkillSystem;
  private cooldownOverlay?: Phaser.GameObjects.Rectangle;

  constructor(scene: Scene, config: any & {
    action: SkillAction;
    skillSystem: BaseSkillSystem;
  }) {
    super(scene, config);
    this.action = config.action;
    this.skillSystem = config.skillSystem;
    this.setupCooldownDisplay();
  }

  private setupCooldownDisplay(): void {
    // Create cooldown overlay
    this.cooldownOverlay = this.scene.add.rectangle(
      0, 0, this.width, this.height,
      0x000000
    ).setAlpha(0.5);
    this.cooldownOverlay.setVisible(false);
    this.addChild(this.cooldownOverlay);
  }

  public showCooldown(percentage: number): void {
    if (this.cooldownOverlay) {
      this.cooldownOverlay.setVisible(true);
      this.cooldownOverlay.width = this.width * (1 - percentage);
    }
  }

  public hideCooldown(): void {
    if (this.cooldownOverlay) {
      this.cooldownOverlay.setVisible(false);
    }
  }
}

/**
 * Skill Progress Display - Shows skill experience and level progress
 */
export class SkillProgressDisplay extends UIComponent {
  private skillSystem: BaseSkillSystem;
  private levelText?: Phaser.GameObjects.Text;
  private progressBar?: ProgressBar;
  private experienceText?: Phaser.GameObjects.Text;

  constructor(scene: Scene, config: any & {
    skillSystem: BaseSkillSystem;
  }) {
    super(scene, config);
    this.skillSystem = config.skillSystem;
  }

  protected create(): void {
    // Create container
    this.container = this.scene.add.container(this.x, this.y);

    // Level text
    this.levelText = this.scene.add.text(
      0, -10,
      `Level ${this.skillSystem.getState().level}`,
      {
        fontSize: '16px',
        color: '#FFD700',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);
    this.addChild(this.levelText);

    // Progress bar
    this.progressBar = new ProgressBar(this.scene, {
      x: 0,
      y: 10,
      width: this.width,
      height: 16,
      backgroundColor: 0x34495E,
      fillColor: 0x2ECC71,
      showText: true,
      textColor: '#FFFFFF',
    });
    this.addChild(this.progressBar.getContainer()!);

    // Experience text
    this.experienceText = this.scene.add.text(
      0, 30,
      '0 / 100 XP',
      {
        fontSize: '12px',
        color: '#CCCCCC',
      }
    ).setOrigin(0.5);
    this.addChild(this.experienceText);

    // Update display
    this.updateDisplay();
  }

  public updateDisplay(): void {
    const state = this.skillSystem.getState();
    const stats = this.skillSystem.getStatistics();

    if (this.levelText) {
      this.levelText.setText(`Level ${state.level}`);
    }

    if (this.progressBar) {
      this.progressBar.setProgress(stats.progressToNext);
    }

    if (this.experienceText) {
      this.experienceText.setText(
        `${state.experience.toLocaleString()} / ${state.experienceToNext.toLocaleString()} XP`
      );
    }
  }
}