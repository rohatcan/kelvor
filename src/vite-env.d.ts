/// <reference types="vite/client" />

// Global type declarations for the project
declare global {
  // Build-time constants
  const __APP_VERSION__: string;
  const __BUILD_TIME__: string;
  const __DEV__: boolean;
  const __TEST__: boolean;

  // Window extensions for game development
  interface Window {
    // Game instance (if needed globally)
    game?: any;

    // Debug utilities
    debug?: {
      log: (...args: any[]) => void;
      error: (...args: any[]) => void;
      warn: (...args: any[]) => void;
    };

    // Performance monitoring
    performance?: {
      now: () => number;
      mark: (name: string) => void;
      measure: (name: string, startMark: string, endMark: string) => void;
    };
  }
}

// Phaser type extensions
declare namespace Phaser {
  namespace Types {
    namespace Input {
      interface InputConfig {
        // Extended input configuration if needed
      }
    }

    namespace Core {
      interface GameConfig {
        // Extended game configuration
        backgroundColor?: string;
        parent?: string | HTMLElement;
        width?: number;
        height?: number;
        scale?: {
          mode?: number;
          autoCenter?: number;
          width?: number;
          height?: number;
        };
      }
    }
  }
}

// Asset loading types
interface GameAsset {
  key: string;
  path: string;
  type: 'image' | 'audio' | 'json' | 'spritesheet' | 'atlas';
  config?: any;
}

// Game configuration types
interface GameConfig {
  width: number;
  height: number;
  parent: string;
  backgroundColor: string;
  scale: {
    mode: number;
    autoCenter: number;
  };
  physics?: {
    default: string;
    arcade?: {
      gravity?: { y: number };
      debug?: boolean;
    };
  };
}

export {};