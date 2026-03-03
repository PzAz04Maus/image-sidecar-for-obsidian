/* eslint-disable prefer-const */
// src/main.ts
import { Plugin, TFile, Notice, normalizePath } from "obsidian";
import { SidecarSettingsTab } from "./SidecarSettingsTab";
import { SidecarJob, SidecarJobStatus, yieldToUI } from "./SidecarJob";

export enum SidecarDirectoryMode {
  Adjacent = "Adjacent",
  Mirror = "Mirror",
  Dump = "Dump"
}


export interface MyPluginSettings {
  enabled: boolean;
  sidecarDirectoryMode: SidecarDirectoryMode;
  optionText: string;
  template: string;
  dir: string;
  optionNumber: number;

  // Performance tuning
  budgetMs: number;
  maxConcurrency: number;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
  enabled: false,
  sidecarDirectoryMode: SidecarDirectoryMode.Adjacent,
  optionText: "default",
  optionNumber: 10,
  dir: "",
  budgetMs: 25,
  maxConcurrency: 4,
  template: `---
Image: \${file.name}
Creator: 
Source: 
License: 
Permissions: 
Focal Point: 
Description: 
tags: 
---
![[\${file.path}]]
LINK: [[\${file.path}]]
CREATED ON: \${currDate}
FILETYPE: \${file.extension.toUpperCase()}
# META // \${file.name.toUpperCase()}`
};


//      //
// Main //
//      //
export default class ImageSidecarPlugin extends Plugin {
  settings: MyPluginSettings;

  private readonly imageRegex = /\.(jpg|jpeg|png|gif|webp|tiff|bmp|pdf)$/i;

  private job: SidecarJob | null = null;
  private startDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private statusBarEl: HTMLElement | null = null;
  private lastStatusText = "";
  private statusUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  private isScanning = false;
  private notifyOnNextIdle = false;
  private lastJobStatus: SidecarJobStatus = { state: "idle" };
  
  // Safely join path segments using forward slashes and normalize
  private joinPath(...parts: (string | undefined)[]): string {
    return normalizePath(parts.filter(Boolean).join("/"));
  }

  // Ensure a folder (and its parents) exists in the vault
  private async ensureFolder(folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath || "");
    if (!normalized || normalized === "/") return;

    const parts = normalized.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (!existing) {
        await this.app.vault.createFolder(current);
      }
    }
  }
  
async insertTemplate(src: TFile, sidecarFile: TFile)
{
    const currDate = new Date().toISOString().split("T")[0];

    // Replace variables in template
    let content = this.settings.template
        .replace(/\${file.name}/g, src.name)
        .replace(/\${file.path}/g, src.path)
        .replace(/\${file.extension}/g, src.extension)
        .replace(/\${currDate}/g, currDate)
        .replace(/\${file.name.toUpperCase\(\)}/g, src.name.toUpperCase())
        .replace(/\${file.extension.toUpperCase\(\)}/g, src.extension.toUpperCase());

    await this.app.vault.modify(sidecarFile, content);
}

  private computeSidecarPath(srcFile: TFile): { destFolder: string; destPath: string } {
    const lastSlash = srcFile.path.lastIndexOf("/");
    const srcFolder = lastSlash >= 0 ? srcFile.path.substring(0, lastSlash) : "";

    let destFolder: string;
    switch (this.settings.sidecarDirectoryMode) {
      case SidecarDirectoryMode.Dump:
        destFolder = normalizePath(this.settings.dir || "");
        break;
      case SidecarDirectoryMode.Mirror:
        destFolder = this.joinPath(this.settings.dir || "", srcFolder);
        break;
      case SidecarDirectoryMode.Adjacent:
      default:
        destFolder = normalizePath(srcFolder);
        break;
    }

    const destPath = this.joinPath(destFolder, `${srcFile.basename}.md`);
    return { destFolder, destPath };
  }

  private scheduleJobStart(): void {
    if (!this.job) return;
    if (this.startDebounceTimer) clearTimeout(this.startDebounceTimer);
    this.startDebounceTimer = setTimeout(() => this.job?.start(), 250);
  }

  private requestStatusUpdate(): void {
    if (!this.statusBarEl) return;
    if (this.statusUpdateTimer) return;

    this.statusUpdateTimer = setTimeout(() => {
      this.statusUpdateTimer = null;
      this.updateStatusBar();
    }, 250);
  }

  private updateStatusBar(): void {
    if (!this.statusBarEl) return;

    let text = "Sidecar: idle";
    if (this.isScanning) {
      text = "Sidecar: scanning…";
    } else if (this.job) {
      const status = this.job.getStatus();
      if (status.state === "idle") {
        text = "Sidecar: idle";
      } else if (status.state === "paused") {
        const queuedTotal = status.queued + status.inFlight;
        text = `Sidecar: paused (${status.created} created, ${queuedTotal} queued)`;
      } else if (status.state === "cancelling") {
        const queuedTotal = status.queued + status.inFlight;
        text = `Sidecar: cancelling (${status.created} created, ${queuedTotal} queued)`;
      } else {
        // running
        const total = status.processed + status.queued + status.inFlight;
        text = `Sidecar: ${status.created} created (${status.processed}/${total})`;
      }
    }

    if (text !== this.lastStatusText) {
      this.statusBarEl.setText(text);
      this.lastStatusText = text;
    }
  }

  private onJobStatus = (status: SidecarJobStatus): void => {
    const prev = this.lastJobStatus;
    this.lastJobStatus = status;
    this.requestStatusUpdate();

    if (prev.state !== "idle" && status.state === "idle" && this.notifyOnNextIdle) {
      this.notifyOnNextIdle = false;

      // We can only read counters before the job goes idle if we had them.
      // Grab them from the last non-idle status (prev).
      new Notice(`Sidecar generation finished: ${prev.created} created, ${prev.skipped} skipped.`);
    }
  };

  private async handleOneImageByPath(filePath: string): Promise<"created" | "skipped"> {
    try {
      if (!this.settings.enabled) return "skipped";

      const abstract = this.app.vault.getAbstractFileByPath(filePath);
      if (!(abstract instanceof TFile)) return "skipped";
      if (!this.imageRegex.test(abstract.name)) return "skipped";

      const { destFolder, destPath } = this.computeSidecarPath(abstract);
      const exists = this.app.vault.getAbstractFileByPath(destPath);
      if (exists) return "skipped";

      await this.ensureFolder(destFolder);
      const sidecarFile = await this.app.vault.create(destPath, "");
      await this.insertTemplate(abstract, sidecarFile);
      return "created";
    } catch (err) {
      console.error("Image Sidecar: failed to create sidecar", { filePath, err });
      return "skipped";
    }
  }

  private async scanVaultAndEnqueueImages(): Promise<void> {
    if (!this.job) return;

    this.isScanning = true;
    this.requestStatusUpdate();

    const files = this.app.vault.getFiles();
    let i = 0;
    const budgetMs = Math.max(1, Number(this.settings.budgetMs) || 1);

    while (i < files.length) {
      const start = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      while (i < files.length) {
        const t = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
        if (t - start >= budgetMs) break;

        const file = files[i++];
        if (this.imageRegex.test(file.name)) {
          this.job.enqueue(file.path);
        }
      }
      await yieldToUI();
    }

    this.isScanning = false;
    this.requestStatusUpdate();
  }

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SidecarSettingsTab(this.app, this));

    this.statusBarEl = this.addStatusBarItem();
    this.updateStatusBar();

    this.job = new SidecarJob((filePath) => this.handleOneImageByPath(filePath), this.onJobStatus, {
      budgetMs: this.settings.budgetMs,
      maxConcurrency: this.settings.maxConcurrency
    });

    this.addCommand({
      id: "image-sidecar-generate-missing",
      name: "Generate missing sidecars (scan vault)",
      callback: async () => {
        if (!this.settings.enabled) {
          new Notice("Image Sidecar: enable the plugin first.");
          return;
        }

        this.notifyOnNextIdle = true;
        await this.scanVaultAndEnqueueImages();
        this.job?.start();
      }
    });

    this.addCommand({
      id: "image-sidecar-pause",
      name: "Pause sidecar generation",
      callback: () => this.job?.pause()
    });

    this.addCommand({
      id: "image-sidecar-resume",
      name: "Resume sidecar generation",
      callback: () => {
        this.job?.resume();
        this.job?.start();
      }
    });

    this.addCommand({
      id: "image-sidecar-cancel",
      name: "Cancel sidecar generation",
      callback: () => this.job?.cancel()
    });

    this.registerEvent(
      this.app.vault.on("create", async (srcFile) => {
        if (!(srcFile instanceof TFile)) return;

        if (!this.settings.enabled) return;
        if (!this.imageRegex.test(srcFile.name)) return;

        this.job?.enqueue(srcFile.path);
        this.scheduleJobStart();
      })
    );
  }

    async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Apply performance settings immediately.
    this.job?.updateOptions({
      budgetMs: this.settings.budgetMs,
      maxConcurrency: this.settings.maxConcurrency
    });
  }

  onunload() {
    if (this.startDebounceTimer) clearTimeout(this.startDebounceTimer);
    if (this.statusUpdateTimer) clearTimeout(this.statusUpdateTimer);
    this.job?.cancel();
  }
}
