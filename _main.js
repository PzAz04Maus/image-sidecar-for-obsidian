const { Plugin, Notice } = require('obsidian');

module.exports = class ImageSidecarPlugin extends Plugin {
  async onload() {
    this.registerEvent(
      this.app.vault.on('create', async (file) => {
        if (!file || !file.name) return;

        const imageRegex = /\.(jpg|jpeg|png|gif|webp|tiff|bmp)$/i;
        if (!imageRegex.test(file.name)) return;

        const sidecarPath = file.path + '.md';
        const existing = this.app.vault.getAbstractFileByPath(sidecarPath);

        if (!existing) {
          const content = `---
image: ${file.name}
tags: []
description: 
---

# Annotation for ${file.name}
`;
          await this.app.vault.create(sidecarPath, content);
          new Notice(`Created sidecar for ${file.name}`);
        }
      })
    );
  }

  onunload() {}
};
