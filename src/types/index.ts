// Core game types
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rectangle extends Position, Size {}

// Player and game state types
export interface Player {
  id: string;
  name: string;
  level: number;
  experience: number;
  experienceToNext: number;
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  position: Position;
  stats: PlayerStats;
  inventory: InventoryItem[];
  skills: Skill[];
  gold: number;
}

export interface PlayerStats {
  attack: number;
  defense: number;
  strength: number;
  hitpoints: number;
  ranged: number;
  prayer: number;
  magic: number;
  cooking: number;
  woodcutting: number;
  fishing: number;
  mining: number;
  smithing: number;
  herblore: number;
  agility: number;
  thieving: number;
  slayer: number;
  farming: number;
  runecrafting: number;
  hunter: number;
  construction: number;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  experience: number;
  experienceToNext: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  slot: number;
  stackable: boolean;
  value: number;
  type: ItemType;
  equipment?: EquipmentSlot;
}

export type ItemType =
  | 'weapon'
  | 'armor'
  | 'food'
  | 'potion'
  | 'resource'
  | 'tool'
  | 'misc';

export type EquipmentSlot =
  | 'head'
  | 'neck'
  | 'body'
  | 'legs'
  | 'feet'
  | 'hands'
  | 'ring'
  | 'weapon'
  | 'shield'
  | 'ammo';

// Game action types
export interface GameAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirements: ActionRequirement[];
  rewards: ActionReward[];
  duration: number; // in milliseconds
  skill?: string;
  experience?: number;
}

export interface ActionRequirement {
  type: 'skill' | 'item' | 'level' | 'quest' | 'gold';
  value: string | number;
  amount?: number;
}

export interface ActionReward {
  type: 'experience' | 'item' | 'gold' | 'skill';
  value: string | number;
  amount: number;
  chance?: number; // 0-1 probability
}

// Game configuration types
export interface GameConfig {
  version: string;
  debug: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // in milliseconds
  maxInventorySlots: number;
  startingGold: number;
  experienceRates: {
    combat: number;
    skilling: number;
  };
}

// UI and component types
export interface UIState {
  currentScene: string;
  inventoryOpen: boolean;
  skillsOpen: boolean;
  settingsOpen: boolean;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

// Save game types
export interface SaveGame {
  version: string;
  timestamp: number;
  player: Player;
  gameConfig: GameConfig;
  uiState: UIState;
  completedActions: string[];
  unlockedAreas: string[];
  activeActions: ActiveAction[];
}

export interface ActiveAction {
  actionId: string;
  startTime: number;
  endTime: number;
  repeats: number;
  currentRepeat: number;
}

// Event system types
export interface GameEvent {
  type: string;
  payload?: any;
  timestamp: number;
}

export interface GameEventEmitter {
  on(event: string, callback: (event: GameEvent) => void): void;
  off(event: string, callback: (event: GameEvent) => void): void;
  emit(event: string, payload?: any): void;
}

// Woodcutting specific types
export interface WoodcuttingSkill extends Skill {
  id: 'woodcutting';
  name: 'Woodcutting';
  currentTree?: TreeType;
  currentTool?: ToolType;
  totalLogsChopped: number;
  treesUnlocked: TreeType[];
  toolsOwned: ToolType[];
}

export interface TreeType {
  id: string;
  name: string;
  level: number;
  experience: number;
  respawnTime: number; // in milliseconds
  logType: LogType;
  chopTime: number; // base time in milliseconds
  health: number;
  icon: string;
  description: string;
}

export interface ToolType {
  id: string;
  name: string;
  level: number;
  speed: number; // chop time multiplier
  effectiveness: number; // success chance multiplier
  durability: number;
  maxDurability: number;
  icon: string;
  description: string;
  buyPrice: number;
  sellPrice: number;
}

export interface LogType {
  id: string;
  name: string;
  description: string;
  value: number;
  burningTime?: number; // for future firemaking skill
  icon: string;
}

// Enhanced skill system
export interface SkillDetails {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  experienceCurve: 'linear' | 'exponential' | 'custom';
  actions: SkillAction[];
}

export interface SkillAction {
  id: string;
  name: string;
  description: string;
  requirements: ActionRequirement[];
  rewards: ActionReward[];
  baseTime: number;
  levelScaling: number;
  icon: string;
  animation?: string;
}

// Enhanced game state
export interface GameState {
  player: Player;
  skills: Record<string, Skill>;
  woodcutting: WoodcuttingSkill;
  activeActions: ActiveAction[];
  completedActions: string[];
  unlockedAreas: string[];
  unlockedContent: string[];
  gameStats: GameStats;
  settings: GameSettings;
  lastSaved: number;
  totalPlayTime: number;
}

export interface GameStats {
  totalActionsCompleted: number;
  totalExperienceGained: number;
  totalGoldEarned: number;
  totalItemsObtained: number;
  sessionsPlayed: number;
  longestSession: number;
  achievementsUnlocked: string[];
}

export interface GameSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  notifications: boolean;
  showAnimations: boolean;
  debugMode: boolean;
}

// Enhanced save system
export interface SaveData {
  version: string;
  gameState: GameState;
  metadata: SaveMetadata;
}

export interface SaveMetadata {
  timestamp: number;
  playTime: number;
  checksum: string;
  deviceId: string;
  appVersion: string;
}

// Enhanced event system
export interface GameEventMap {
  'skill:level_up': { skillId: string; newLevel: number };
  'action:started': { actionId: string; duration: number };
  'action:completed': { actionId: string; rewards: ActionReward[] };
  'action:failed': { actionId: string; reason: string };
  'inventory:added': { item: InventoryItem; quantity: number };
  'inventory:removed': { item: InventoryItem; quantity: number };
  'player:gold_changed': { amount: number; newTotal: number };
  'player:experience_gained': { skillId: string; amount: number; newTotal: number };
  'game:saved': { timestamp: number };
  'game:loaded': { timestamp: number };
  'game:started': { timestamp: number };
  'game:paused': { timestamp: number };
  'game:resumed': { timestamp: number };
  'ui:notification': { notification: Notification };
  'woodcutting:tree_chopped': { treeId: string; logCount: number; experience: number };
  'woodcutting:tool_equipped': { toolId: string };
  'achievement:unlocked': { achievementId: string };
}

export type GameEventType = keyof GameEventMap;

export interface TypedGameEvent<T extends GameEventType> {
  type: T;
  payload: GameEventMap[T];
  timestamp: number;
}

// Enhanced action system
export interface ActionProgress {
  actionId: string;
  startTime: number;
  endTime: number;
  progress: number; // 0-1
  isPaused: boolean;
  currentCycle: number;
  totalCycles: number;
}

export interface ActionResult {
  success: boolean;
  rewards: ActionReward[];
  experience: Record<string, number>;
  failureReason?: string;
  critBonus?: number;
}

// Achievement system
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirements: AchievementRequirement[];
  rewards: AchievementReward[];
  hidden: boolean;
  category: string;
}

export interface AchievementRequirement {
  type: 'skill_level' | 'total_actions' | 'total_gold' | 'items_collected' | 'time_played';
  value: number;
  skillId?: string;
  itemId?: string;
}

export interface AchievementReward {
  type: 'experience' | 'gold' | 'item' | 'title' | 'cosmetic';
  value: string | number;
  amount?: number;
}

// Time-based mechanics
export interface IdleProgress {
  actionId: string;
  timeAway: number;
  maxIdleTime: number;
  efficiency: number;
  potentialRewards: ActionReward[];
}

// UI State management
export interface UIState {
  currentScene: string;
  activePanels: UIPanel[];
  tooltips: Tooltip[];
  modals: Modal[];
  notifications: Notification[];
  hudState: HUDState;
}

export interface UIPanel {
  id: string;
  type: 'inventory' | 'skills' | 'settings' | 'achievements' | 'shop';
  isOpen: boolean;
  position?: Position;
  size?: Size;
}

export interface Tooltip {
  id: string;
  text: string;
  position: Position;
  target?: string;
  duration?: number;
  timestamp: number;
}

export interface Modal {
  id: string;
  type: 'confirmation' | 'information' | 'error' | 'settings';
  title: string;
  content: string;
  buttons?: ModalButton[];
  persistent?: boolean;
}

export interface ModalButton {
  text: string;
  action: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface HUDState {
  healthBarVisible: boolean;
  experienceBarVisible: boolean;
  minimapVisible: boolean;
  actionQueueVisible: boolean;
  notificationsVisible: boolean;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Game configuration constants
export const GAME_CONSTANTS = {
  MAX_LEVEL: 99,
  BASE_EXPERIENCE: 100,
  EXPERIENCE_MULTIPLIER: 1.1,
  MAX_IDLE_TIME: 24 * 60 * 60 * 1000, // 24 hours
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  NOTIFICATION_DURATION: 5000, // 5 seconds
  MAX_INVENTORY_SLOTS: 28,
  BASE_ACTION_TIME: 1000, // 1 second
} as const;