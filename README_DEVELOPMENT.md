# Kelvor Idle RPG - Development Documentation

## Overview

This document provides a comprehensive overview of the Kelvor idle RPG game architecture, systems, and implementation. The game is built with TypeScript, Phaser.js, and follows a modular, extensible architecture designed to support multiple skills and features.

## Architecture Overview

### Core Systems

#### 1. GameEngine (`/src/core/GameEngine.ts`)
**Purpose**: Central game state management and main game loop coordinator.

**Key Features**:
- Game state management with automatic persistence
- Main game loop running at 10 FPS
- Auto-save functionality with configurable intervals
- Session tracking and statistics
- Event-driven architecture integration
- Player data management (gold, experience, stats)

**Usage**:
```typescript
const gameEngine = new GameEngine();
gameEngine.start(); // Start the game loop
gameEngine.stop();  // Stop the game loop
const gameState = gameEngine.getGameState(); // Get current game state
```

#### 2. EventSystem (`/src/core/EventSystem.ts`)
**Purpose**: Type-safe event-driven communication system for all game components.

**Key Features**:
- Strongly typed events with payload validation
- Event history tracking and debugging
- Event middleware support
- Promise-based event waiting
- Event queuing system
- Automatic cleanup and memory management

**Usage**:
```typescript
// Listen to events
eventSystem.onGameEvent('skill:level_up', (event) => {
  console.log(`${event.payload.skillId} reached level ${event.payload.newLevel}`);
});

// Emit events
eventSystem.emitSkillLevelUp('woodcutting', 5);

// Wait for events
const levelUpEvent = await eventSystem.waitForEvent('skill:level_up', 5000);
```

#### 3. SaveLoadSystem (`/src/core/SaveLoadSystem.ts`)
**Purpose**: Robust save/load functionality with validation, backup, and migration support.

**Key Features**:
- Automatic game state validation
- Version migration system
- Automatic backup creation
- Save file import/export
- Checksum verification for data integrity
- Offline progress calculation

**Usage**:
```typescript
const saveLoadSystem = new SaveLoadSystem();
await saveLoadSystem.saveGame(gameState);
const result = await saveLoadSystem.loadGame();
const backups = saveLoadSystem.getAvailableBackups();
```

### Game Systems

#### 1. WoodcuttingSystem (`/src/systems/WoodcuttingSystem.ts`)
**Purpose**: Complete woodcutting skill implementation with tree chopping, tools, and progression.

**Key Features**:
- Tree types with different requirements and rewards
- Tool progression system with durability
- XP calculations with level scaling
- Critical hit mechanics
- Success chance calculations based on skill level and tools

**Tree Types**:
- Regular Tree (Level 1)
- Oak Tree (Level 5)
- Willow Tree (Level 10)
- Maple Tree (Level 15)
- Yew Tree (Level 25)
- Magic Tree (Level 40)
- Redwood Tree (Level 55)

**Tool Progression**:
- Bronze Hatchet (Level 1)
- Iron Hatchet (Level 5)
- Steel Hatchet (Level 10)
- Black Hatchet (Level 15)
- Mithril Hatchet (Level 20)
- Adamant Hatchet (Level 30)
- Rune Hatchet (Level 40)
- Dragon Hatchet (Level 60)
- Crystal Hatchet (Level 70)

### Utility Systems

#### 1. GameCalculations (`/src/utils/GameCalculations.ts`)
**Purpose**: Comprehensive utility functions for game mechanics.

**Key Components**:
- **ExperienceCalculator**: XP curves, level progression, bonus calculations
- **TimeCalculator**: Duration formatting, idle progress, timing calculations
- **ProbabilityCalculator**: Success chances, critical hits, random rewards
- **StatCalculator**: Combat levels, skill progression, equipment bonuses
- **GameUtils**: Number formatting, utility functions

**Usage**:
```typescript
// Experience calculations
const expNeeded = GameUtils.experience.calculateExperienceForLevel(10);
const levelFromXP = GameUtils.experience.calculateLevelFromExperience(5000);

// Time calculations
const formatted = GameUtils.time.formatDuration(3600000); // "1h 0m 0s"
const idleProgress = GameUtils.time.calculateOfflineProgress(lastActive, maxIdleTime);

// Probability calculations
const successChance = GameUtils.probability.calculateSuccessChance(0.5, 0.1, 0.05);
const isCrit = GameUtils.probability.rollForChance(0.1);
```

### Data Management

#### 1. WoodcuttingData (`/src/data/WoodcuttingData.ts`)
**Purpose**: Static data definitions for all woodcutting content.

**Contents**:
- Tree definitions with stats and requirements
- Tool progression data
- Log types and values
- Skill actions and rewards
- Milestones and achievements
- Level-up rewards

## Scene Structure

### 1. BootScene (`/src/scenes/BootScene.ts`)
**Purpose**: Initial loading screen and asset preloading.

**Features**:
- Loading screen with progress bar
- Essential asset loading
- Automatic transition to main menu

### 2. MainMenuScene (`/src/scenes/MainMenuScene.ts`)
**Purpose**: Main menu interface.

**Features**:
- Game title and branding
- Play button
- Settings access
- Version information
- Background and UI elements

### 3. GameScene (`/src/scenes/GameScene.ts`)
**Purpose**: Main gameplay scene with full game engine integration.

**Features**:
- Game engine initialization and management
- Interactive tree chopping mechanics
- Real-time UI updates
- Event-driven notifications
- Auto-save integration
- Settings and manual save options

**Game Loop Integration**:
```typescript
// Game scene integrates with all systems
private gameEngine: GameEngine;
private gameState: GameState;
private woodcuttingSkill: WoodcuttingSkill;

// Systems communicate via events
eventSystem.onGameEvent('woodcutting:tree_chopped', (event) => {
  this.showNotification(`+${event.payload.logCount} logs`, 'success');
});
```

## UI Component System

### Base Components (`/src/components/UIComponent.ts`)

#### 1. UIComponent (Abstract Base)
- Container-based component system
- Position and size management
- Child object management
- Lifecycle callbacks

#### 2. Panel
- Background and border rendering
- Configurable colors and styling
- Container for other UI elements

#### 3. TextButton
- Interactive button with hover states
- Customizable styling
- Click event handling

#### 4. ProgressBar
- Visual progress representation
- Text display options
- Dynamic fill colors

#### 5. ToastNotification
- Auto-dismissing notifications
- Type-based styling (info, success, warning, error)
- Configurable lifetime

## TypeScript Type System

### Core Types (`/src/types/index.ts`)

#### Enhanced Type Definitions:
- **GameState**: Complete game state structure
- **WoodcuttingSkill**: Specialized skill with tools and trees
- **TreeType/ToolType/LogType**: Content type definitions
- **GameEventMap**: Type-safe event system
- **SaveData**: Save file structure with metadata
- **UIState**: UI component state management

#### Type Safety Features:
- Strict event payload typing
- Generic utility types (DeepPartial, RequiredFields, etc.)
- Configuration constants
- Component prop interfaces

## File Structure

```
src/
├── core/                    # Core game systems
│   ├── GameEngine.ts       # Main game state and loop management
│   ├── EventSystem.ts      # Type-safe event communication
│   └── SaveLoadSystem.ts   # Save/load with validation
├── systems/                # Game mechanic systems
│   └── WoodcuttingSystem.ts # Woodcutting skill implementation
├── utils/                   # Utility functions and calculations
│   └── GameCalculations.ts # XP, time, probability calculations
├── data/                    # Static game data
│   └── WoodcuttingData.ts  # Trees, tools, achievements
├── components/              # UI component system
│   └── UIComponent.ts      # Base UI components
├── scenes/                  # Phaser scenes
│   ├── BootScene.ts        # Loading screen
│   ├── MainMenuScene.ts    # Main menu
│   └── GameScene.ts        # Main gameplay
├── types/                   # TypeScript type definitions
│   └── index.ts            # All game types
├── css/                     # Styling
│   ├── styles.css          # Main styles
│   ├── animations.css      # Animations
│   ├── components.css      # Component styles
│   ├── mobile.css          # Mobile responsive
│   └── accessibility.css   # Accessibility features
└── index.ts                 # Main exports
```

## Development Features

### 1. Debug Tools
Available in development mode via `window.devTools`:
```javascript
// Get current game state
window.devTools.getGameState();

// Save game manually
window.devTools.saveGame();

// Reset game to new state
window.devTools.resetGame();

// Get event statistics
window.devTools.getEventStats();

// Clear event history
window.devTools.clearEventHistory();
```

### 2. Error Handling
- Global error catching with user notifications
- Scene-specific error boundaries
- Graceful degradation for missing assets
- Development mode enhanced logging

### 3. Performance Optimization
- Game loop runs at 10 FPS to reduce CPU usage
- Event-driven updates minimize unnecessary renders
- Object pooling for frequently created elements
- Automatic cleanup of destroyed components

## Game Mechanics

### 1. Experience System
- Exponential XP curve with configurable multipliers
- Level-based XP reduction for overlevel content
- Tool and skill bonuses
- Critical hit XP multipliers

### 2. Woodcutting Mechanics
- Success chance based on skill level and tool quality
- Chop time affected by tool speed and skill level
- Tree health and log yield calculations
- Tool durability system

### 3. Idle Progress
- Offline progress calculation with efficiency decay
- Maximum idle time limits (24 hours)
- Action queue system for multiple consecutive actions
- Real-time progress tracking

## Future Extensibility

### Adding New Skills
1. Create skill-specific type definitions in `/types/index.ts`
2. Implement skill system in `/systems/[SkillName]System.ts`
3. Add skill data to `/data/[SkillName]Data.ts`
4. Integrate with GameEngine and event system
5. Create UI components for skill interface

### Adding New Content
1. Define content types in `/types/index.ts`
2. Add content data to appropriate `/data/*.ts` file
3. Implement game mechanics in relevant system
4. Update UI components to display new content
5. Add events for content interactions

### Save System Extensions
1. Add new fields to save data types
2. Update validation logic in SaveLoadSystem
3. Implement migration logic for version changes
4. Test save/load functionality

## Testing Strategy

### Unit Testing
- Game calculation utilities
- Event system functionality
- Save/load validation
- Type system validation

### Integration Testing
- Game engine with scenes
- Event system communication
- Save/load end-to-end
- UI component interactions

### Manual Testing
- Gameplay flow testing
- Save/load reliability
- Performance under load
- Browser compatibility

## Performance Considerations

### Memory Management
- Automatic cleanup of destroyed objects
- Event listener removal
- Texture caching and unloading
- Scene-specific resource management

### CPU Optimization
- 10 FPS game loop for efficiency
- Delta-time independent calculations
- Throttled UI updates
- Efficient collision detection

### Storage Optimization
- Compressed save files
- Automatic backup cleanup
- Minimal localStorage usage
- Efficient data structures

## Security Considerations

### Save File Security
- Checksum validation
- Version compatibility checking
- Data sanitization
- Backup restoration protection

### Code Security
- No eval() usage
- Input validation
- Type safety enforcement
- Error information sanitization

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Fallbacks
- Graceful degradation for older browsers
- localStorage availability checking
- Feature detection with polyfills
- Error boundary fallbacks

This comprehensive architecture provides a solid foundation for the idle RPG game with excellent extensibility for future features and skills.