/**
 * Skill UI Example - Demonstrates how to use the new skill UI system
 */
import { Scene } from 'phaser';
import { SkillOverviewPanel, SkillPanel } from './SkillUISystem';
import { skillRegistry } from './SkillRegistry';

export class SkillUIExample {
  private scene: Scene;
  private overviewPanel?: SkillOverviewPanel;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Create a skills overview panel showing all skills
   */
  public createSkillOverviewPanel(x: number, y: number, width: number, height: number): SkillOverviewPanel {
    this.overviewPanel = new SkillOverviewPanel(this.scene, {
      x,
      y,
      width,
      height,
      showLocked: true,
      showProgress: true,
      compactMode: false,
    });

    return this.overviewPanel;
  }

  /**
   * Create a specific skill panel
   */
  public createSkillPanel(skillId: string, x: number, y: number, width: number, height: number): SkillPanel | null {
    const registration = skillRegistry.getSkillRegistration(skillId);
    if (!registration) {
      console.warn(`Skill not found: ${skillId}`);
      return null;
    }

    return new SkillPanel(this.scene, {
      x,
      y,
      width,
      height,
      skillId,
      showLocked: true,
      showProgress: true,
      compactMode: false,
      showActions: true,
      showStatistics: true,
    });
  }

  /**
   * Create a compact skills bar for the main game UI
   */
  public createSkillsBar(x: number, y: number, width: number, height: number): void {
    const unlockedSkills = skillRegistry.getUnlockedSkills();
    const panelWidth = 120;
    const panelHeight = height - 20;
    const spacing = 10;

    unlockedSkills.slice(0, 5).forEach((registration, index) => {
      const panelX = x + 10 + (index * (panelWidth + spacing));
      const panelY = y + height / 2;

      const panel = new SkillPanel(this.scene, {
        x: panelX,
        y: panelY,
        width: panelWidth,
        height: panelHeight,
        skillId: registration.id,
        showLocked: false,
        showProgress: true,
        compactMode: true,
        showActions: false,
        showStatistics: false,
      });
    });
  }

  /**
   * Update all skill UI elements
   */
  public updateAllPanels(): void {
    if (this.overviewPanel) {
      this.overviewPanel.updateSkillPanels();
    }
  }

  /**
   * Show skill details modal
   */
  public showSkillDetailsModal(skillId: string): void {
    const registration = skillRegistry.getSkillRegistration(skillId);
    if (!registration) return;

    // Create a simple modal (in a real game, you'd have a proper modal system)
    const modalWidth = 400;
    const modalHeight = 500;
    const modalX = this.scene.cameras.main.width / 2;
    const modalY = this.scene.cameras.main.height / 2;

    // Background
    const background = this.scene.add.rectangle(
      modalX, modalY, modalWidth, modalHeight, 0x2C3E50
    ).setStrokeStyle(3, 0x34495E);

    // Title
    const title = this.scene.add.text(
      modalX, modalY - modalHeight / 2 + 30,
      `${registration.details.icon} ${registration.details.name}`,
      {
        fontSize: '24px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);

    // Description
    const description = this.scene.add.text(
      modalX, modalY - modalHeight / 2 + 70,
      registration.details.description,
      {
        fontSize: '14px',
        color: '#CCCCCC',
        wordWrap: { width: modalWidth - 40 },
        align: 'center',
      }
    ).setOrigin(0.5);

    // Skill statistics
    const stats = registration.system.getStatistics();
    const statsText = this.scene.add.text(
      modalX, modalY - 20,
      `Level: ${stats.currentLevel}\n` +
      `Experience: ${stats.totalExperience.toLocaleString()}\n` +
      `Actions: ${stats.actionsCompleted}\n` +
      `Time: ${Math.floor(stats.timeSpent / 1000)}s`,
      {
        fontSize: '16px',
        color: '#FFFFFF',
        align: 'center',
      }
    ).setOrigin(0.5);

    // Close button
    const closeButton = this.scene.add.text(
      modalX, modalY + modalHeight / 2 - 30,
      'Close',
      {
        fontSize: '16px',
        color: '#FFFFFF',
        backgroundColor: '#E74C3C',
        padding: { x: 20, y: 10 },
      }
    ).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        background.destroy();
        title.destroy();
        description.destroy();
        statsText.destroy();
        closeButton.destroy();
      });

    // Add to background to maintain depth
    background.setDepth(100);
    title.setDepth(101);
    description.setDepth(101);
    statsText.setDepth(101);
    closeButton.setDepth(102);
  }

  /**
   * Create a skill comparison panel
   */
  public createSkillComparisonPanel(skillIds: string[], x: number, y: number, width: number, height: number): void {
    const panelWidth = width / skillIds.length - 10;

    skillIds.forEach((skillId, index) => {
      const panelX = x + (index * (panelWidth + 10)) + panelWidth / 2;

      const panel = new SkillPanel(this.scene, {
        x: panelX,
        y: y + height / 2,
        width: panelWidth,
        height: height - 20,
        skillId,
        showLocked: false,
        showProgress: true,
        compactMode: true,
        showActions: false,
        showStatistics: true,
      });
    });
  }

  /**
   * Show skill milestones
   */
  public showSkillMilestones(skillId: string): void {
    const skillSystem = skillRegistry.getSkill(skillId);
    if (!skillSystem) return;

    const milestones = skillSystem.getNextMilestones();
    if (milestones.length === 0) {
      return;
    }

    const modalWidth = 300;
    const modalHeight = 200;
    const modalX = this.scene.cameras.main.width / 2;
    const modalY = this.scene.cameras.main.height / 2;

    // Background
    const background = this.scene.add.rectangle(
      modalX, modalY, modalWidth, modalHeight, 0x34495E
    ).setStrokeStyle(2, 0x2C3E50);

    // Title
    const title = this.scene.add.text(
      modalX, modalY - modalHeight / 2 + 30,
      'Next Milestones',
      {
        fontSize: '18px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);

    // Milestones
    const milestoneText = milestones.map(milestone =>
      `Level ${milestone.level}: ${milestone.reward}`
    ).join('\n');

    const milestonesDisplay = this.scene.add.text(
      modalX, modalY,
      milestoneText,
      {
        fontSize: '14px',
        color: '#FFFFFF',
        align: 'center',
      }
    ).setOrigin(0.5);

    // Close button
    const closeButton = this.scene.add.text(
      modalX, modalY + modalHeight / 2 - 25,
      'Close',
      {
        fontSize: '14px',
        color: '#FFFFFF',
        backgroundColor: '#E74C3C',
        padding: { x: 15, y: 8 },
      }
    ).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        background.destroy();
        title.destroy();
        milestonesDisplay.destroy();
        closeButton.destroy();
      });
  }

  /**
   * Clean up all UI elements
   */
  public destroy(): void {
    if (this.overviewPanel) {
      this.overviewPanel.destroy();
      this.overviewPanel = undefined;
    }
  }
}