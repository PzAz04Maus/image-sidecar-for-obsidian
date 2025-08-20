// src/main.ts
import { Plugin, TFile, Notice } from "obsidian";
import { SidecarSettingsTab } from "./SidecarSettingsTab";

export interface MyPluginSettings {
  enabled: boolean;
  optionText: string;
  optionNumber: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const DEFAULT_SETTINGS: MyPluginSettings = {
  enabled: true,
  optionText: "default",
  optionNumber: 10
};


//      //
// Main //
//      //
export default class ImageSidecarPlugin extends Plugin {
  settings: MyPluginSettings;
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SidecarSettingsTab(this.app, this));

    this.registerEvent(
      this.app.vault.on("create", async (file) => {
        if (!(file instanceof TFile)) return;

        const imageRegex = /\.(jpg|jpeg|png|gif|webp|tiff|bmp|pdf)$/i;
        if (!imageRegex.test(file.name)) return;

        const folder = file.path.substring(0, file.path.lastIndexOf("/"));
        const noExtPath = `${folder}/${file.basename}`;

        const sidecarPath = noExtPath + ".md";
        const exists = this.app.vault.getAbstractFileByPath(sidecarPath.toUpperCase());
        const currDate: Date = new Date();

        if (!exists) {
            
          const content = `---
Image: ${file.name}
Creator: 
Source: 
License: 
Permissions: 
Focal Point: 
Description: 
tags: 
---
![[${file.path}]]
LINK: [[${file.path}]]
CREATED ON: ${currDate}
FILETYPE: ${file.extension.toUpperCase()}
# META // ${file.name.toUpperCase()}
`;

          await this.app.vault.create(sidecarPath, content);
          new Notice(`Created sidecar for ${file.name} @ ${noExtPath}`);
        }
      })
    );
  }

    async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    // Clean up if needed
  }
}
