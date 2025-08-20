import { App, PluginSettingTab, Setting } from "obsidian";
import ImageSidecarPlugin from "./main";



//
// --- Settings tab class ---
//
export class SidecarSettingsTab extends PluginSettingTab {
  plugin: ImageSidecarPlugin;

  
  constructor(app: App, plugin: ImageSidecarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "My Plugin Settings" });

    //Toggle
    new Setting(containerEl)
      .setName("Enable feature")
      .setDesc("Turn the main feature on or off")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enabled)
          .onChange(async (value) => {
            this.plugin.settings.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    //Text input
    new Setting(containerEl)
      .setName("Custom text")
      .setDesc("Enter some text for the plugin")
      .addText(text =>
        text
          .setPlaceholder("Type here...")
          .setValue(this.plugin.settings.optionText)
          .onChange(async (value) => {
            this.plugin.settings.optionText = value;
            await this.plugin.saveSettings();
          })
      );

    //slider
    new Setting(containerEl)
      .setName("Number setting")
      .setDesc("Pick a number")
      .addSlider(slider =>
        slider
          .setLimits(1, 100, 1)
          .setValue(this.plugin.settings.optionNumber)
          .onChange(async (value) => {
            this.plugin.settings.optionNumber = value;
            await this.plugin.saveSettings();
          })
      );
  }
}