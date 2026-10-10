/**
 * Phase 13: Client-side API Request Rate Limiter
 * Token bucket algorithm preventing accidental request floods or quota exhaustion on AI endpoints.
 */

export class RateLimiter {
  private tokens: number;
  private lastRefillTimestamp: number;

  constructor(
    private maxTokens: number = 10,
    private refillRatePerSecond: number = 2
  ) {
    this.tokens = maxTokens;
    this.lastRefillTimestamp = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSecond;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  public tryAcquire(cost: number = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  public getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}
