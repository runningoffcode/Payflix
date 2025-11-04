/**
 * RPC Request Queue Service
 * Prevents 429 rate limit errors by queuing and throttling RPC requests
 * Based on best practices from: https://solana.stackexchange.com/questions/12906
 */

type QueuedRequest<T> = {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  retryCount: number;
  priority: number; // Lower number = higher priority
};

class RPCRequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private readonly minDelay = 300; // Minimum 300ms between requests (increased from 100ms)
  private readonly maxConcurrent = 1; // Max 1 concurrent request (reduced from 2 for devnet)
  private activeRequests = 0;
  private lastRequestTime = 0;

  /**
   * Add a request to the queue
   * @param execute Function that returns a promise
   * @param priority Lower number = higher priority (0 = highest)
   * @returns Promise that resolves when the request completes
   */
  async enqueue<T>(execute: () => Promise<T>, priority: number = 5): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);
      const request: QueuedRequest<T> = {
        id,
        execute,
        resolve,
        reject,
        retryCount: 0,
        priority,
      };

      // Insert based on priority (lower priority number = execute first)
      const insertIndex = this.queue.findIndex(r => r.priority > priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      console.log(`📋 Queued request ${id} (priority: ${priority}, queue size: ${this.queue.length})`);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      // Wait for minimum delay since last request
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
      }

      const request = this.queue.shift();
      if (!request) continue;

      this.activeRequests++;
      this.lastRequestTime = Date.now();

      // Process request without blocking the queue
      this.executeRequest(request);
    }

    this.processing = false;
  }

  private async executeRequest<T>(request: QueuedRequest<T>) {
    try {
      console.log(`🚀 Executing request ${request.id} (retry: ${request.retryCount})`);
      const result = await request.execute();
      request.resolve(result);
      console.log(`✅ Request ${request.id} completed`);
    } catch (error: any) {
      // Handle 429 rate limit errors with exponential backoff
      if ((error?.message?.includes('429') || error?.message?.includes('Too many requests')) && request.retryCount < 3) {
        const delay = Math.pow(2, request.retryCount) * 1000; // 1s, 2s, 4s
        console.warn(`⏳ Request ${request.id} hit rate limit. Retrying in ${delay/1000}s... (attempt ${request.retryCount + 1}/3)`);

        request.retryCount++;

        // Re-queue with higher priority after delay
        setTimeout(() => {
          this.queue.unshift(request); // Add to front of queue
          this.processQueue();
        }, delay);
      } else {
        console.error(`❌ Request ${request.id} failed:`, error?.message || error);
        request.reject(error);
      }
    } finally {
      this.activeRequests--;
      // Continue processing queue
      setTimeout(() => this.processQueue(), this.minDelay);
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueSize: this.queue.length,
      activeRequests: this.activeRequests,
      processing: this.processing,
    };
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.queue.forEach(req => {
      req.reject(new Error('Request queue cleared'));
    });
    this.queue = [];
  }
}

// Export singleton instance
export const rpcQueue = new RPCRequestQueue();

/**
 * Helper function to wrap RPC calls with automatic queuing
 * @param execute RPC call function
 * @param priority Request priority (0 = highest, 10 = lowest)
 */
export function queueRPCRequest<T>(
  execute: () => Promise<T>,
  priority: number = 5
): Promise<T> {
  return rpcQueue.enqueue(execute, priority);
}

/**
 * Priority levels for different types of requests
 */
export const RPC_PRIORITY = {
  CRITICAL: 0,    // User-initiated actions (payments, withdrawals)
  HIGH: 2,        // Wallet balance for MAX button
  MEDIUM: 5,      // Session balance, user profile
  LOW: 7,         // Token metadata, owned videos
  BACKGROUND: 9,  // Polling, refresh operations
} as const;
