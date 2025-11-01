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

    // Load essential assets first with error handling
    this.load.setBaseURL('/assets/');

    // Load UI assets with error handling
    this.load.image('logo', 'images/logo.svg');
    this.load.image('background', 'images/background.jpg');

    // Load spritesheets
    this.load.spritesheet('buttons', 'images/buttons.png', {
      frameWidth: 200,
      frameHeight: 50,
    });

    // Note: Audio files removed - will create fallbacks if needed
    // Audio loading disabled to prevent decoding errors

    // Handle asset loading errors
    this.load.on('loaderror', (fileLoader: any) => {
      console.warn(`Failed to load asset: ${fileLoader.key}`);

      // Create fallback assets for all critical images
      if (fileLoader.key === 'logo' || fileLoader.key === 'background' || fileLoader.key === 'buttons') {
        this.createFallbackAsset(fileLoader.key);
      }

      // Don't let audio failures block the game (even though audio is removed)
      if (fileLoader.key === 'click' || fileLoader.key === 'background') {
        console.log(`Audio asset ${fileLoader.key} failed to load, continuing without audio`);
      }
    });

    // Complete loading even if some assets fail
    this.load.on('complete', () => {
      console.log('Asset loading completed (with or without errors)');

      // Ensure critical assets exist
      if (!this.textures.exists('logo')) {
        this.createFallbackAsset('logo');
      }
      if (!this.textures.exists('background')) {
        this.createFallbackAsset('background');
      }
      if (!this.textures.exists('buttons')) {
        this.createFallbackAsset('buttons');
      }
    });

    this.load.on('filecomplete', (key: string, type: string, data: any) => {
      console.log(`Successfully loaded asset: ${key}`);
    });
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
    const progressBar = this.add.rectangle(width / 2 - 200, height / 2 + 20, 1, 20, 0x27ae60)
      .setOrigin(0, 0.5);

    // Update progress bar
    this.load.on('progress', (progress: number) => {
      progressBar.width = 400 * progress;
    });

    // Complete loading
    this.load.on('complete', () => {
      progressBar.fillColor = 0x8BC34A;
    });
  }

  private createFallbackAsset(assetKey: string): void {
    const { width, height } = this.cameras.main;

    console.log(`Creating fallback asset for: ${assetKey}`);

    // Create fallback textures using canvas
    const graphics = this.add.graphics();

    switch (assetKey) {
      case 'logo':
        // Create a proper logo with text
        graphics.fillStyle(0x2c3e50);
        graphics.fillRect(0, 0, 400, 100);

        // Add text (using Phaser's built-in text system as fallback)
        graphics.generateTexture('logo', 400, 100);

        // Create a text overlay when the texture is used
        console.log('Created fallback logo texture');
        break;

      case 'background':
        // Create a proper gradient background
        graphics.fillGradientStyle(0x1a1a1a, 0x1a1a1a, 0x2c3e50, 0x2c3e50);
        graphics.fillRect(0, 0, width, height);

        // Add some decorative elements
        graphics.fillStyle(0x3498db, 0.3);
        graphics.fillCircle(100, 100, 50);
        graphics.fillStyle(0x9b59b6, 0.2);
        graphics.fillCircle(width - 100, height - 100, 80);

        graphics.generateTexture('background', width, height);
        console.log('Created fallback background texture');
        break;

      case 'buttons':
        // Create a proper buttons spritesheet
        graphics.fillStyle(0x27ae60);
        graphics.fillRect(0, 0, 200, 50); // Play button

        graphics.fillStyle(0x3498db);
        graphics.fillRect(0, 50, 200, 50); // Settings button

        graphics.fillStyle(0xe74c3c);
        graphics.fillRect(0, 100, 200, 50); // Exit button

        graphics.generateTexture('buttons', 200, 150);
        console.log('Created fallback buttons spritesheet');
        break;
    }

    graphics.destroy();
  }
}