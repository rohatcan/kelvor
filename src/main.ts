/**
 * Main entry point for the Kelvor idle RPG game
 */
import { Game } from 'phaser';
import { eventSystem } from '@/core/EventSystem';
import { GameEngine } from '@/core/GameEngine';
import { authService } from '@/core/AuthService';
import { AuthSaveLoadSystem } from '@/core/AuthSaveLoadSystem';
import { OAuthCallbackHandler } from '@/core/OAuthCallbackHandler';
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

  // Initialize authentication system
  console.log('Initializing authentication system...');
  authService.updateActivity(); // Initialize activity tracking

  // Initialize OAuth callback handler
  OAuthCallbackHandler.initialize();

  // Initialize event system
  eventSystem.onGameEvent('game:started', () => {
    console.log('Game event system initialized');
  });

  // Setup authentication event handlers
  setupAuthenticationEventHandlers();

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
    (window as any).authService = authService;
    (window as any).AuthSaveLoadSystem = AuthSaveLoadSystem;

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
      // Authentication tools
      getAuthState: () => authService.getAuthState(),
      getCurrentUser: () => authService.getCurrentUser(),
      login: () => authService.loginWithGoogle(),
      logout: () => authService.logout(),
      isAuth: () => authService.isAuthenticated(),
    };

    console.log('Development tools available via window.devTools');
  }

  return game;
}

/**
 * Setup authentication event handlers
 */
function setupAuthenticationEventHandlers(): void {
  // Handle login events
  authService.on('auth:login', (event) => {
    const { user, isNewUser } = event.payload;
    console.log(`User logged in: ${user.name} (${user.email})${isNewUser ? ' - New User!' : ''}`);

    // Send analytics event (in a real implementation)
    if (__DEV__) {
      console.log('Analytics: User login', { userId: user.id, isNewUser });
    }
  });

  // Handle logout events
  authService.on('auth:logout', (event) => {
    const { reason } = event.payload;
    console.log(`User logged out. Reason: ${reason || 'User initiated'}`);

    // Send analytics event (in a real implementation)
    if (__DEV__) {
      console.log('Analytics: User logout', { reason });
    }
  });

  // Handle authentication errors
  authService.on('auth:error', (event) => {
    const { error } = event.payload;
    console.error('Authentication error:', error);

    // Show user-friendly error notification
    eventSystem.emitUINotification({
      id: `auth_error_${Date.now()}`,
      type: 'error',
      title: 'Authentication Error',
      message: error.message,
      timestamp: Date.now(),
    });
  });

  // Handle session expiration
  authService.on('auth:session_expired', (event) => {
    const { reason } = event.payload;
    console.warn('Session expired:', reason);

    // Show session expired notification
    eventSystem.emitUINotification({
      id: `session_expired_${Date.now()}`,
      type: 'warning',
      title: 'Session Expired',
      message: 'Your session has expired. Please login again.',
      timestamp: Date.now(),
    });
  });

  // Handle token refresh
  authService.on('auth:token_refresh', (event) => {
    const { success } = event.payload;
    if (__DEV__) {
      console.log(`Token refresh ${success ? 'succeeded' : 'failed'}`);
    }
  });
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame);
} else {
  initializeGame();
}

export default initializeGame;