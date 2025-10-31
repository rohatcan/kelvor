/**
 * Main menu scene - handles the main game menu
 */
import { Scene } from 'phaser';

export class MainMenuScene extends Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    this.add.image(width / 2, height / 2, 'background')
      .setDisplaySize(width, height);

    // Logo
    this.add.image(width / 2, height / 4, 'logo')
      .setOrigin(0.5);

    // Title
    this.add.text(width / 2, height / 2 - 100, 'Kelvor', {
      fontSize: '64px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 2 - 40, 'Idle RPG Adventure', {
      fontSize: '24px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Play button
    const playButton = this.add.text(width / 2, height / 2 + 50, 'PLAY', {
      fontSize: '32px',
      color: '#FFFFFF',
      backgroundColor: '#4CAF50',
      padding: { x: 40, y: 20 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playButton.on('pointerdown', () => {
      this.sound.play('click');
      this.scene.start('GameScene');
    });

    playButton.on('pointerover', () => {
      playButton.setStyle({ backgroundColor: '#45a049' });
    });

    playButton.on('pointerout', () => {
      playButton.setStyle({ backgroundColor: '#4CAF50' });
    });

    // Settings button
    const settingsButton = this.add.text(width / 2, height / 2 + 120, 'Settings', {
      fontSize: '24px',
      color: '#FFFFFF',
      backgroundColor: '#2196F3',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    settingsButton.on('pointerdown', () => {
      this.sound.play('click');
      // TODO: Open settings modal
      console.log('Settings clicked');
    });

    settingsButton.on('pointerover', () => {
      settingsButton.setStyle({ backgroundColor: '#1976D2' });
    });

    settingsButton.on('pointerout', () => {
      settingsButton.setStyle({ backgroundColor: '#2196F3' });
    });

    // Version info
    this.add.text(10, height - 20, `v${__APP_VERSION__}`, {
      fontSize: '14px',
      color: '#CCCCCC',
    });
  }
}