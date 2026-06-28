/**
 * Tiny circuit breaker for flaky external sources (e.g. the Ollama / Hugging Face catalog scrapers,
 * whose HTML can change or rate-limit). After `threshold` consecutive failures it "opens" for
 * `cooldownMs`: while open, callers should skip the call entirely and surface a contingency state
 * instead of hammering a source that's already down (and making the user wait for each timeout).
 * A single success — or the cooldown elapsing — closes it again. Pure; `now` is injectable for tests.
 */
export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;

  constructor(
    private readonly threshold = 3,
    private readonly cooldownMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  /** True while tripped — callers should short-circuit and not touch the source. */
  get open(): boolean {
    return this.now() < this.openUntil;
  }

  /** A call succeeded → reset. */
  recordSuccess(): void {
    this.failures = 0;
    this.openUntil = 0;
  }

  /** A call failed → trip once `threshold` consecutive failures are reached. */
  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openUntil = this.now() + this.cooldownMs;
    }
  }
}
