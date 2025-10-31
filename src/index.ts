/**
 * Main exports for the Kelvor idle RPG game
 */

// Core systems
export { GameEngine } from '@/core/GameEngine';
export { EventSystem, eventSystem, EventQueue } from '@/core/EventSystem';
export { SaveLoadSystem } from '@/core/SaveLoadSystem';

// Game systems
export { WoodcuttingSystem, woodcuttingSystem } from '@/systems/WoodcuttingSystem';

// Utility functions
export {
  ExperienceCalculator,
  TimeCalculator,
  ProbabilityCalculator,
  StatCalculator,
  GameUtils,
} from '@/utils/GameCalculations';

// UI components
export {
  UIComponent,
  Panel,
  TextButton,
  ProgressBar,
  ToastNotification,
} from '@/components/UIComponent';

// Game data
export {
  WOODCUTTING_TREES,
  WOODCUTTING_TOOLS,
  WOODCUTTING_LOGS,
  WOODCUTTING_ACTIONS,
  WOODCUTTING_MILESTONES,
  WOODCUTTING_ACHIEVEMENTS,
} from '@/data/WoodcuttingData';

// Types (re-export for convenience)
export * from '@/types';

// Scenes
export { BootScene } from '@/scenes/BootScene';
export { MainMenuScene } from '@/scenes/MainMenuScene';
export { GameScene } from '@/scenes/GameScene';