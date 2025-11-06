import { App, PluginSettingTab, Setting } from "obsidian";
import ImageSidecarPlugin from "./main";
import { SidecarDirectoryMode } from "./main";
import { AbstractInputSuggest, TFolder } from "obsidian";

class FolderSuggest extends AbstractInputSuggest<TFolder> {
  inputEl: HTMLInputElement; // now TS knows it exists

  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.inputEl = inputEl;
  }

  getSuggestions(inputStr: string): TFolder[] {
    return this.app.vault.getAllLoadedFiles()
      .filter((f): f is TFolder => f instanceof TFolder)
      .filter(f => f.path.toLowerCase().includes(inputStr.toLowerCase()));
  }

  renderSuggestion(folder: TFolder, el: HTMLElement) {
    el.setText(folder.path);
  }

  selectSuggestion(folder: TFolder) {
    (this.inputEl as HTMLInputElement).value = folder.path;
    (this.inputEl as HTMLInputElement).trigger("input");
    this.close();
  }
}




//
// --- Settings tab class ---
//
export class SidecarSettingsTab extends PluginSettingTab {
  plugin: ImageSidecarPlugin;

  
  constructor(app: App, plugin: ImageSidecarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  SidecarDirectoryLabels: Record<SidecarDirectoryMode, string> = {
    Adjacent: "Adjacent Folder",
    Mirror: "Mirror Directory",
    Dump: "Dump Directory"
};

    //TODO: modify value based on directory type
    //Outputs value, no change
    async setDir(value: string): Promise<string> 
    {
        return value;
        // let currDir = this.plugin.settings.dir;
        // switch(this.plugin.settings.sidecarDirectoryMode)
        // {
        //     //we need a dir
        //     case SidecarDirectoryMode.Mirror:
        //     case SidecarDirectoryMode.Dump:
        //         if(currDir==="")
        //         {
        //             currDir="/";//TODO: our behavior is poorly handled.
        //                         //If our dir is empty (as in Adjacent behavior) and we switch to it, then we get unexpected behavior
        //                         //
        //             this.plugin.settings.dir=currDir;
        //         }
        //         else
        //         {
        //             //we need to test for a legitimate directory
        //         }
        //         break;            
        //     //we don't need a dir
        //     case SidecarDirectoryMode.Adjacent:
        //     default:
        //         break;
        // }
    }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    
    //Toggle
    //returns BOOL
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


    //Accepts ImageSidecarPlugin.settings.sidecarDirectoryMode
    //Returns value: SidecarDirectoryMode
    new Setting(containerEl)
        .setName("Set Directory Mode")
        .setDesc("Sets the destination directory of the sidecar file.")
        .addDropdown(drop => {
        (Object.values(SidecarDirectoryMode) as SidecarDirectoryMode[]).forEach(mode => {
            drop.addOption(mode,this.SidecarDirectoryLabels[mode]);
        });
            drop.setValue(this.plugin.settings.sidecarDirectoryMode);
            drop.onChange(async(value: SidecarDirectoryMode) => {

                this.plugin.settings.sidecarDirectoryMode = value;
                await this.plugin.saveSettings();
            }); 
        });
        
    //TODO: I couldn't take the expected route because of obsidians scoping constraints. I'll have to review the code to see whether this returns the correct value
    //TODO: How do I select root?
    //Accepts ImageSidecarPlugin.settings
    //returns ??
    new Setting(containerEl)
        .setName("Target Folder")
        .setDesc("Choose a folder in your vault")
        .addSearch(search => {
            search.setPlaceholder("Example: MyNotes/")
            .setValue(this.plugin.settings.dir)
            .onChange(async (value) => {
                this.plugin.settings.dir = await this.setDir(value);
                await this.plugin.saveSettings();
            });
            new FolderSuggest(this.app, search.inputEl);
        });


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