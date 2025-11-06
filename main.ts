/* eslint-disable prefer-const */
// src/main.ts
import { Plugin, TFile, Notice } from "obsidian";
import { SidecarSettingsTab } from "./SidecarSettingsTab";

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
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
  enabled: false,
  sidecarDirectoryMode: SidecarDirectoryMode.Adjacent,
  optionText: "default",
  optionNumber: 10,
  dir: "",
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

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SidecarSettingsTab(this.app, this));

    this.registerEvent(
      this.app.vault.on("create", async (srcFile) => {
        if (!(srcFile instanceof TFile)) return;

        const imageRegex = /\.(jpg|jpeg|png|gif|webp|tiff|bmp|pdf)$/i;
        if (!imageRegex.test(srcFile.name)) return;

        let srcFolder = srcFile.path.substring(0, srcFile.path.lastIndexOf("/"));

        

        const srcNoExt = `${srcFolder}/${srcFile.basename}`;
        let destPath = srcNoExt + ".md";

        switch(this.settings.sidecarDirectoryMode)
        {
            case SidecarDirectoryMode.Dump:
                destPath = this.settings.dir;
                break;
            case SidecarDirectoryMode.Mirror:
                destPath = this.settings.dir + "/" + destPath;
                break;
            case SidecarDirectoryMode.Adjacent:
            default:
                break;
        }

        const exists = this.app.vault.getAbstractFileByPath(destPath.toUpperCase());
        
        if (this.settings.enabled && !exists) {
            const sidecarFile = await this.app.vault.create(destPath, "");
            await this.insertTemplate(srcFile,sidecarFile);
            //await this.app.vault.create(sidecarPath, template);
            new Notice(`Created sidecar ${sidecarFile} @ ${this.settings.dir}`);
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
