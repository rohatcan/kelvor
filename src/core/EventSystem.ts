/**
 * Type-safe EventSystem for game-wide communication
 * Extends EventEmitter with strong typing for game events
 */
import { EventEmitter } from 'events';
import {
  GameEventMap,
  GameEventType,
  TypedGameEvent,
  GameEvent,
  Notification,
  ActionReward,
  InventoryItem,
} from '@/types';

type EventCallback<T extends GameEventType> = (event: TypedGameEvent<T>) => void;
type GenericEventCallback = (event: GameEvent) => void;

export class EventSystem extends EventEmitter {
  private static instance: EventSystem;
  private eventHistory: GameEvent[] = [];
  private maxHistorySize: number = 1000;
  private customListeners: Map<string, Set<GenericEventCallback>> = new Map();

  private constructor() {
    super();
    this.setupMaxListeners();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EventSystem {
    if (!EventSystem.instance) {
      EventSystem.instance = new EventSystem();
    }
    return EventSystem.instance;
  }

  /**
   * Configure max listeners for the event emitter
   */
  private setupMaxListeners(): void {
    this.setMaxListeners(100); // Allow many listeners for a complex game
  }

  /**
   * Emit a typed game event
   */
  public emitGameEvent<T extends GameEventType>(
    type: T,
    payload: GameEventMap[T]
  ): boolean {
    const event: TypedGameEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };

    // Add to history
    this.addToHistory(event);

    // Log in debug mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Event] ${type}:`, payload);
    }

    // Emit the event
    return this.emit(type, event);
  }

  /**
   * Listen to a specific typed game event
   */
  public onGameEvent<T extends GameEventType>(
    type: T,
    callback: EventCallback<T>
  ): void {
    const typedCallback = callback as GenericEventCallback;

    // Add to our listeners map for tracking
    if (!this.customListeners.has(type)) {
      this.customListeners.set(type, new Set());
    }
    this.customListeners.get(type)!.add(typedCallback);

    // Add the actual event listener
    this.on(type, typedCallback);
  }

  /**
   * Listen to a specific typed game event once
   */
  public onceGameEvent<T extends GameEventType>(
    type: T,
    callback: EventCallback<T>
  ): void {
    const typedCallback = callback as GenericEventCallback;

    // Add to our listeners map for tracking
    if (!this.customListeners.has(type)) {
      this.customListeners.set(type, new Set());
    }
    this.customListeners.get(type)!.add(typedCallback);

    // Add the actual event listener
    this.once(type, typedCallback);
  }

  /**
   * Remove a listener for a specific event type
   */
  public offGameEvent<T extends GameEventType>(
    type: T,
    callback: EventCallback<T>
  ): void {
    const typedCallback = callback as GenericEventCallback;
    const typeListeners = this.customListeners.get(type);

    if (typeListeners) {
      typeListeners.delete(typedCallback);
      if (typeListeners.size === 0) {
        this.customListeners.delete(type);
      }
    }

    this.off(type, typedCallback);
  }

  /**
   * Remove all listeners for a specific event type
   */
  public removeAllGameEventListeners<T extends GameEventType>(type: T): void {
    const typeListeners = this.customListeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(callback => {
        this.off(type, callback);
      });
      this.customListeners.delete(type);
    }
  }

  /**
   * Add event to history (circular buffer)
   */
  private addToHistory(event: GameEvent): void {
    this.eventHistory.push(event);

    // Maintain circular buffer
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   */
  public getEventHistory(type?: GameEventType): GameEvent[] {
    if (type) {
      return this.eventHistory.filter(event => event.type === type);
    }
    return [...this.eventHistory];
  }

  /**
   * Get recent events within a time window
   */
  public getRecentEvents(timeWindowMs: number, type?: GameEventType): GameEvent[] {
    const cutoffTime = Date.now() - timeWindowMs;
    let events = this.eventHistory.filter(event => event.timestamp >= cutoffTime);

    if (type) {
      events = events.filter(event => event.type === type);
    }

    return events;
  }

  /**
   * Clear event history
   */
  public clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get statistics about event usage
   */
  public getEventStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    listenerCounts: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    const listenerCounts: Record<string, number> = {};

    // Count events by type
    this.eventHistory.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    });

    // Count listeners by type
    this.customListeners.forEach((listeners, type) => {
      listenerCounts[type] = listeners.size;
    });

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      listenerCounts,
    };
  }

  /**
   * Create an event middleware for logging, debugging, or analytics
   */
  public createEventMiddleware(
    name: string,
    filter?: (event: GameEvent) => boolean,
    transform?: (event: GameEvent) => GameEvent
  ): void {
    const originalEmit = this.emitGameEvent.bind(this);

    this.emitGameEvent = function<T extends GameEventType>(
      type: T,
      payload: GameEventMap[T]
    ): boolean {
      const event: TypedGameEvent<T> = {
        type,
        payload,
        timestamp: Date.now(),
      };

      // Apply filter if provided
      if (filter && !filter(event)) {
        return false;
      }

      // Apply transform if provided
      const finalEvent = transform ? transform(event) : event;

      // Log middleware action
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Middleware:${name}] ${type}:`, finalEvent.payload);
      }

      return originalEmit(type, finalEvent.payload);
    };
  }

  /**
   * Convenience methods for common game events
   */

  public emitSkillLevelUp(skillId: string, newLevel: number): boolean {
    return this.emitGameEvent('skill:level_up', { skillId, newLevel });
  }

  public emitActionStarted(actionId: string, duration: number): boolean {
    return this.emitGameEvent('action:started', { actionId, duration });
  }

  public emitActionCompleted(actionId: string, rewards: ActionReward[]): boolean {
    return this.emitGameEvent('action:completed', { actionId, rewards });
  }

  public emitActionFailed(actionId: string, reason: string): boolean {
    return this.emitGameEvent('action:failed', { actionId, reason });
  }

  public emitInventoryAdded(item: InventoryItem, quantity: number): boolean {
    return this.emitGameEvent('inventory:added', { item, quantity });
  }

  public emitInventoryRemoved(item: InventoryItem, quantity: number): boolean {
    return this.emitGameEvent('inventory:removed', { item, quantity });
  }

  public emitPlayerGoldChanged(amount: number, newTotal: number): boolean {
    return this.emitGameEvent('player:gold_changed', { amount, newTotal });
  }

  public emitPlayerExperienceGained(skillId: string, amount: number, newTotal: number): boolean {
    return this.emitGameEvent('player:experience_gained', { skillId, amount, newTotal });
  }

  public emitGameSaved(timestamp: number): boolean {
    return this.emitGameEvent('game:saved', { timestamp });
  }

  public emitGameLoaded(timestamp: number): boolean {
    return this.emitGameEvent('game:loaded', { timestamp });
  }

  public emitUINotification(notification: Notification): boolean {
    return this.emitGameEvent('ui:notification', { notification });
  }

  public emitWoodcuttingTreeChopped(treeId: string, logCount: number, experience: number): boolean {
    return this.emitGameEvent('woodcutting:tree_chopped', { treeId, logCount, experience });
  }

  public emitWoodcuttingToolEquipped(toolId: string): boolean {
    return this.emitGameEvent('woodcutting:tool_equipped', { toolId });
  }

  public emitAchievementUnlocked(achievementId: string): boolean {
    return this.emitGameEvent('achievement:unlocked', { achievementId });
  }

  /**
   * Batch emit multiple events atomically
   */
  public emitBatch(events: Array<{ type: GameEventType; payload: any }>): void {
    events.forEach(({ type, payload }) => {
      this.emitGameEvent(type as any, payload);
    });
  }

  /**
   * Create a Promise that resolves when a specific event is emitted
   */
  public waitForEvent<T extends GameEventType>(
    type: T,
    timeout?: number
  ): Promise<TypedGameEvent<T>> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.offGameEvent(type, callback);
      };

      const callback: EventCallback<T> = (event) => {
        cleanup();
        resolve(event);
      };

      this.onGameEvent(type, callback);

      if (timeout) {
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout waiting for event: ${type}`));
        }, timeout);
      }
    });
  }

  /**
   * Create an event queue for processing events in order
   */
  public createEventQueue(): EventQueue {
    return new EventQueue(this);
  }

  /**
   * Debug method to print current event system state
   */
  public debug(): void {
    const stats = this.getEventStats();
    console.group('EventSystem Debug Info');
    console.log('Total Events in History:', stats.totalEvents);
    console.log('Events by Type:', stats.eventsByType);
    console.log('Listener Counts:', stats.listenerCounts);
    console.log('Memory Usage:', process.memoryUsage());
    console.groupEnd();
  }

  /**
   * Cleanup method to prevent memory leaks
   */
  public destroy(): void {
    this.removeAllListeners();
    this.customListeners.clear();
    this.clearEventHistory();
  }
}

/**
 * Event Queue for processing events in order
 */
export class EventQueue {
  private queue: GameEvent[] = [];
  private isProcessing: boolean = false;
  private eventSystem: EventSystem;

  constructor(eventSystem: EventSystem) {
    this.eventSystem = eventSystem;
  }

  /**
   * Add an event to the queue
   */
  public enqueue<T extends GameEventType>(type: T, payload: GameEventMap[T]): void {
    this.queue.push({
      type,
      payload,
      timestamp: Date.now(),
    });

    this.processQueue();
  }

  /**
   * Process events in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift()!;

      // Emit the event
      this.eventSystem.emitGameEvent(event.type as any, event.payload);

      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    this.isProcessing = false;
  }

  /**
   * Clear all events from the queue
   */
  public clear(): void {
    this.queue = [];
  }

  /**
   * Get the current queue size
   */
  public size(): number {
    return this.queue.length;
  }
}

// Export singleton instance for easy access
export const eventSystem = EventSystem.getInstance();