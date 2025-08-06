// src/main.ts
import { Plugin, TFile, Notice } from "obsidian";

export default class ImageSidecarPlugin extends Plugin {
  async onload() {
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
image: ${file.name}
creator: 
License: 
Permissions:
tags: []
description: 
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

  onunload() {
    // Clean up if needed
  }
}