import { DomainEventEnvelope, EventHandler } from './types';

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private processedIds = new Set<string>();

  /**
   * Subscribe an event handler for a specific event type or wildcard pattern
   */
  subscribe(pattern: string, handler: EventHandler): () => void {
    if (!this.handlers.has(pattern)) {
      this.handlers.set(pattern, new Set());
    }
    this.handlers.get(pattern)!.add(handler);

    return () => {
      this.handlers.get(pattern)?.delete(handler);
    };
  }

  /**
   * Unsubscribe a previously registered handler
   */
  unsubscribe(pattern: string, handler: EventHandler): void {
    this.handlers.get(pattern)?.delete(handler);
  }

  /**
   * Dispatch an event to all matching subscribers
   * Enforces loop prevention (chainDepth < 5) and consumer idempotency
   */
  async dispatch(event: DomainEventEnvelope): Promise<boolean> {
    // Loop prevention check
    if (event.origin && event.origin.chainDepth >= 5) {
      console.warn(
        `[EventBus] Dropping event ${event.id} due to excessive chain depth: ${event.origin.chainDepth}`
      );
      return false;
    }

    // Consumer idempotency
    if (this.processedIds.has(event.id)) {
      return true; // Already processed
    }
    this.processedIds.add(event.id);

    // Keep set bounded
    if (this.processedIds.size > 10000) {
      const firstEntries = Array.from(this.processedIds).slice(0, 2000);
      for (const id of firstEntries) {
        this.processedIds.delete(id);
      }
    }

    const matchingHandlers: EventHandler[] = [];

    // Exact match
    const exact = this.handlers.get(event.type);
    if (exact) {
      matchingHandlers.push(...Array.from(exact));
    }

    // Prefix wildcard match (e.g. "task.*")
    const dotIndex = event.type.indexOf('.');
    if (dotIndex > 0) {
      const prefixPattern = event.type.substring(0, dotIndex) + '.*';
      const wildcard = this.handlers.get(prefixPattern);
      if (wildcard) {
        matchingHandlers.push(...Array.from(wildcard));
      }
    }

    // Global wildcard match ("*")
    const all = this.handlers.get('*');
    if (all) {
      matchingHandlers.push(...Array.from(all));
    }

    // Run handlers concurrently
    await Promise.all(
      matchingHandlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (err) {
          console.error(
            `[EventBus] Error executing handler for event ${event.type} (${event.id}):`,
            err
          );
        }
      })
    );

    return true;
  }

  clear(): void {
    this.handlers.clear();
    this.processedIds.clear();
  }
}
