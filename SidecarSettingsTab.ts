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

    
    //Toggle
    new Setting(containerEl)
      .setName("Enable")
      .setDesc("Turn the automated sidecar maker on or off")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enabled)
          .onChange(async (value) => {
            this.plugin.settings.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    //template
    const wrapper = containerEl.createDiv({ cls: "setting-item" });

    // Description div
    const descEl = wrapper.createDiv({ cls: "setting-item-description" });
    descEl.setText(
    "This text will be inserted when creating a new file. Note: only dynamic variables described in the default template are currently supported."
    );

    // Textarea element
    const textareaEl = wrapper.createEl("textarea");
    textareaEl.placeholder = "Enter your template...";
    textareaEl.value = this.plugin.settings.template;

    // Styling
    textareaEl.style.display = "block";
    textareaEl.style.width = "100%";
    textareaEl.style.height = "900px";
    textareaEl.style.resize = "vertical";
    textareaEl.style.marginTop = "8px";

    // Save changes on input
    textareaEl.addEventListener("input", async () => {
    this.plugin.settings.template = textareaEl.value;
    await this.plugin.saveSettings();
    });

    // containerEl.createEl("h2", { text: "My Plugin Settings" });

    
    // new Setting(containerEl)
    // .setName("Template")
    // .setDesc("This text will be inserted when creating a new file. Note: only dynamic variables described in the default template are currently supported.")
    // .addTextArea(text => {
    // text
    //     .setPlaceholder("Enter your template...")
    //     .setValue(this.plugin.settings.template)
    //     .onChange(async (value) => {
    //         this.plugin.settings.template = value;
    //         await this.plugin.saveSettings();
    //     });
    
    //     text.inputEl.style.display = "block";
    //     text.inputEl.style.width = "100%";
    //     text.inputEl.style.height = "900px";
    //     text.inputEl.style.resize = "vertical";
    //     text.inputEl.style.marginTop = "8px";
    // });


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