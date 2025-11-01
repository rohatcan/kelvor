/**
 * Browser-compatible EventEmitter implementation
 * Provides the same API as Node.js EventEmitter but works in browsers
 */

export interface EventEmitterListener {
  (...args: any[]): void;
}

export class EventEmitter {
  private events: Map<string, EventEmitterListener[]> = new Map();
  private maxListeners: number = 10;
  private _events: Map<string, EventEmitterListener[]> = new Map();
  private _maxListeners: number = 10;

  /**
   * Add a listener for the given event
   */
  on(event: string, listener: EventEmitterListener): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event)!;
    listeners.push(listener);

    // Check for max listeners warning
    if (this.maxListeners > 0 && listeners.length > this.maxListeners) {
      console.warn(`MaxListenersExceededWarning: ${listeners.length} listeners added for event "${event}". Possible memory leak detected.`);
    }

    return this;
  }

  /**
   * Add a one-time listener for the given event
   */
  once(event: string, listener: EventEmitterListener): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };

    return this.on(event, onceWrapper);
  }

  /**
   * Remove the listener for the given event
   */
  off(event: string, listener: EventEmitterListener): this {
    if (!this.events.has(event)) {
      return this;
    }

    const listeners = this.events.get(event)!;
    const index = listeners.indexOf(listener);

    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.events.delete(event);
    }

    return this;
  }

  /**
   * Remove all listeners for the given event, or all listeners if no event is specified
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }

    return this;
  }

  /**
   * Emit an event with the given arguments
   */
  emit(event: string, ...args: any[]): boolean {
    if (!this.events.has(event)) {
      return false;
    }

    const listeners = [...this.events.get(event)!]; // Copy array to avoid issues with modifications during iteration

    for (const listener of listeners) {
      try {
        listener.apply(this, args);
      } catch (error) {
        // Emit error event for unhandled errors
        if (event !== 'error') {
          this.emit('error', error);
        } else {
          // Re-throw if error event itself has an error
          throw error;
        }
      }
    }

    return true;
  }

  /**
   * Get the number of listeners for the given event
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  /**
   * Get an array of listeners for the given event
   */
  listeners(event: string): EventEmitterListener[] {
    return [...(this.events.get(event) || [])];
  }

  /**
   * Get the names of all events that have listeners
   */
  eventNames(): string[] {
    return [...this.events.keys()];
  }

  /**
   * Set the maximum number of listeners for a single event
   */
  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  /**
   * Get the maximum number of listeners for a single event
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }

  /**
   * Add a listener (alias for 'on')
   */
  addListener(event: string, listener: EventEmitterListener): this {
    return this.on(event, listener);
  }

  /**
   * Remove a listener (alias for 'off')
   */
  removeListener(event: string, listener: EventEmitterListener): this {
    return this.off(event, listener);
  }

  /**
   * Add a listener to the beginning of the listeners array for the given event
   */
  prependListener(event: string, listener: EventEmitterListener): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event)!.unshift(listener);

    return this;
  }

  /**
   * Add a one-time listener to the beginning of the listeners array for the given event
   */
  prependOnceListener(event: string, listener: EventEmitterListener): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };

    return this.prependListener(event, onceWrapper);
  }

  /**
   * Get the raw listeners array for the given event (including once wrappers)
   */
  rawListeners(event: string): EventEmitterListener[] {
    return [...(this.events.get(event) || [])];
  }
}