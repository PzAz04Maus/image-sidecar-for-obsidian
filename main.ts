/* eslint-disable prefer-const */
// src/main.ts
import { Plugin, TFile, Notice } from "obsidian";
import { SidecarSettingsTab } from "./SidecarSettingsTab";

export interface MyPluginSettings {
  enabled: boolean;
  optionText: string;
  optionNumber: number;
  template: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
  enabled: false,
  optionText: "default",
  optionNumber: 10,
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

  
async insertTemplate(src: TFile, sidecarFile: TFile) {
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

        if (this.settings.enabled && !exists) {

            // Create file
            const sidecarFile = await this.app.vault.create(sidecarPath, "");
            await this.insertTemplate(file,sidecarFile);
            //await this.app.vault.create(sidecarPath, template);
            new Notice(`Created sidecar ${sidecarFile} @ ${noExtPath}`);
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
