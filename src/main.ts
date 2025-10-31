/**
 * Main entry point for the Kelvor idle RPG game
 */
import { Game } from 'phaser';
import { eventSystem } from '@/core/EventSystem';
import { GameEngine } from '@/core/GameEngine';
import { BootScene } from '@/scenes/BootScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { GameScene } from '@/scenes/GameScene';

// Game configuration
const gameConfig: any = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: __DEV__,
    },
  },
  scene: [],
};

// Initialize global systems
function initializeGame(): Game {
  console.log(`Starting Kelvor v${__APP_VERSION__}`);

  // Initialize event system
  eventSystem.onGameEvent('game:started', () => {
    console.log('Game event system initialized');
  });

  // Create and start the game
  const game = new Game(gameConfig);

  // Register scenes
  game.scene.add('BootScene', BootScene, true);
  game.scene.add('MainMenuScene', MainMenuScene);
  game.scene.add('GameScene', GameScene);

  // Global error handling
  window.addEventListener('error', (errorEvent) => {
    console.error('Global error:', errorEvent.error);
    eventSystem.emitUINotification({
      id: `global_error_${Date.now()}`,
      type: 'error',
      title: 'Error',
      message: 'An unexpected error occurred. Please refresh the page.',
      timestamp: Date.now(),
    });
  });

  // Handle page visibility changes (for idle mechanics)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      eventSystem.emitGameEvent('game:paused', { timestamp: Date.now() });
      console.log('Game paused - tab hidden');
    } else {
      eventSystem.emitGameEvent('game:resumed', { timestamp: Date.now() });
      console.log('Game resumed - tab visible');
    }
  });

  // Handle window before unload (save game)
  window.addEventListener('beforeunload', () => {
    // Note: We can't use async here, so synchronous operations only
    console.log('Application shutting down');
  });

  // Export for debugging
  if (__DEV__) {
    (window as any).game = game;
    (window as any).eventSystem = eventSystem;
    (window as any).GameEngine = GameEngine;

    // Development commands
    (window as any).devTools = {
      getGameState: () => {
        const gameScene = game.scene.getScene('GameScene') as any;
        return gameScene?.gameEngine?.getGameState();
      },
      saveGame: () => {
        const gameScene = game.scene.getScene('GameScene') as any;
        return gameScene?.gameEngine?.saveGame();
      },
      resetGame: () => {
        const gameScene = game.scene.getScene('GameScene') as any;
        return gameScene?.gameEngine?.resetGame();
      },
      getEventStats: () => eventSystem.getEventStats(),
      clearEventHistory: () => eventSystem.clearEventHistory(),
    };

    console.log('Development tools available via window.devTools');
  }

  return game;
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame);
} else {
  initializeGame();
}

export default initializeGame;