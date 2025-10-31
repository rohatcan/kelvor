/**
 * Boot scene - handles game initialization and asset loading
 */
import { Scene } from 'phaser';

export class BootScene extends Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading UI
    this.createLoadingScreen();

    // Load essential assets first
    this.load.setBaseURL('assets/');

    // Load UI assets
    this.load.image('logo', 'images/logo.png');
    this.load.image('background', 'images/main-bg.jpg');

    // Load spritesheets
    this.load.spritesheet('buttons', 'images/buttons.png', {
      frameWidth: 200,
      frameHeight: 50,
    });

    // Load audio
    this.load.audio('click', 'audio/click.wav');
    this.load.audio('background', 'audio/background.mp3');
  }

  create(): void {
    // Once everything is loaded, start the main menu
    this.scene.start('MainMenuScene');
  }

  private createLoadingScreen(): void {
    const { width, height } = this.cameras.main;

    // Loading text
    this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Progress bar background
    this.add.rectangle(width / 2, height / 2 + 20, 400, 20, 0x222222)
      .setOrigin(0.5);

    // Progress bar fill
    const progressBar = this.add.rectangle(
      width / 2 - 200,
      height / 2 + 20,
      0,
      20,
      0x4CAF50
    ).setOrigin(0, 0.5);

    // Update progress bar
    this.load.on('progress', (progress: number) => {
      progressBar.width = 400 * progress;
    });

    // Complete loading
    this.load.on('complete', () => {
      progressBar.fillColor = 0x8BC34A;
    });
  }
}