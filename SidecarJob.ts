import { TFile } from "obsidian";

export type SidecarJobStatus =
  | { state: "idle" }
  | { state: "running"; processed: number; created: number; skipped: number; queued: number }
  | { state: "paused"; processed: number; created: number; skipped: number; queued: number }
  | { state: "cancelling"; processed: number; created: number; skipped: number; queued: number };

export interface SidecarJobOptions {
  budgetMs?: number;
}

function nowMs(): number {
  // performance.now() is present in Obsidian/Electron; fall back defensively.
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function yieldToUI(): Promise<void> {
  if (typeof requestAnimationFrame === "function") {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export class SidecarJob {
  private queue: string[] = [];
  private queuedSet = new Set<string>();

  private running = false;
  private paused = false;
  private cancelRequested = false;

  private resumePromise: Promise<void> | null = null;
  private resumeResolver: (() => void) | null = null;

  private processed = 0;
  private created = 0;
  private skipped = 0;

  private readonly budgetMs: number;

  constructor(
    private readonly handler: (filePath: string) => Promise<"created" | "skipped">,
    private readonly onStatus?: (status: SidecarJobStatus) => void,
    options: SidecarJobOptions = {}
  ) {
    this.budgetMs = options.budgetMs ?? 10;
  }

  getStatus(): SidecarJobStatus {
    const base = {
      processed: this.processed,
      created: this.created,
      skipped: this.skipped,
      queued: this.queue.length
    };

    if (!this.running) return { state: "idle" };
    if (this.cancelRequested) return { state: "cancelling", ...base };
    if (this.paused) return { state: "paused", ...base };
    return { state: "running", ...base };
  }

  enqueue(fileOrPath: TFile | string): void {
    const filePath = typeof fileOrPath === "string" ? fileOrPath : fileOrPath.path;
    if (this.queuedSet.has(filePath)) return;
    this.queuedSet.add(filePath);
    this.queue.push(filePath);
    this.onStatus?.(this.getStatus());
  }

  enqueueMany(filePaths: Iterable<string>): void {
    for (const filePath of filePaths) this.enqueue(filePath);
  }

  clearQueue(): void {
    this.queue.length = 0;
    this.queuedSet.clear();
    this.onStatus?.(this.getStatus());
  }

  start(): void {
    if (this.running) return;
    this.processed = 0;
    this.created = 0;
    this.skipped = 0;
    this.running = true;
    this.cancelRequested = false;
    this.onStatus?.(this.getStatus());
    void this.runLoop();
  }

  pause(): void {
    if (!this.running) return;
    this.paused = true;
    this.onStatus?.(this.getStatus());
  }

  resume(): void {
    if (!this.running) return;
    if (!this.paused) return;

    this.paused = false;
    if (this.resumeResolver) this.resumeResolver();
    this.resumePromise = null;
    this.resumeResolver = null;
    this.onStatus?.(this.getStatus());
  }

  cancel(): void {
    if (!this.running) return;
    this.cancelRequested = true;
    this.onStatus?.(this.getStatus());

    // If paused, let the loop progress so it can observe cancellation.
    if (this.paused) this.resume();
  }

  private async waitForResumeOrCancel(): Promise<void> {
    if (!this.paused) return;

    if (!this.resumePromise) {
      this.resumePromise = new Promise<void>((resolve) => {
        this.resumeResolver = resolve;
      });
    }

    await this.resumePromise;
  }

  private async runLoop(): Promise<void> {
    try {
      while (this.queue.length) {
        if (this.cancelRequested) break;
        if (this.paused) await this.waitForResumeOrCancel();
        if (this.cancelRequested) break;

        const tickStart = nowMs();
        while (this.queue.length && nowMs() - tickStart < this.budgetMs) {
          if (this.cancelRequested) break;
          if (this.paused) break;

          const filePath = this.queue.shift();
          if (!filePath) break;
          this.queuedSet.delete(filePath);

          const result = await this.handler(filePath);
          this.processed += 1;
          if (result === "created") this.created += 1;
          else this.skipped += 1;
        }

        this.onStatus?.(this.getStatus());
        await yieldToUI();
      }
    } finally {
      const cancelled = this.cancelRequested;
      this.running = false;
      this.paused = false;
      this.cancelRequested = false;

      if (cancelled) {
        this.clearQueue();
      }

      this.onStatus?.(this.getStatus());
    }
  }
}
