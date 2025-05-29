import { App, PluginSettingTab, Setting } from "obsidian";
import type { AbbrPlugin } from "./plugin";
import { manageGlobalAbbreviations } from "./manager-modal";

export class AbbrSettingTab extends PluginSettingTab {
  plugin: AbbrPlugin;

  constructor(app: App, plugin: AbbrPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    //* metadataKeyword
    const metadataKeywordSetting = new Setting(containerEl)
      .setName("Metadata keyword")
      .addText((text) =>
        text
          .setPlaceholder("Enter the keyword")
          .setValue(this.plugin.settings.metadataKeyword)
          .onChange(async (value) => {
            this.plugin.settings.metadataKeyword = value.trim();
            await this.plugin.saveSettings();
          })
      );

    const metadataKeywordDesc = createFragment();
    metadataKeywordDesc.append(
      "The key name that reads the abbreviation information from the ",
      createEl("a", {
        href: "https://help.obsidian.md/Editing+and+formatting/Properties",
        text: "properties",
      }),
      "."
    );
    metadataKeywordSetting.descEl.appendChild(metadataKeywordDesc);

    //* markInSourceMode
    new Setting(containerEl)
      .setName("Mark abbreviations in Source mode")
      .setDesc(
        "In Source mode, mark abbreviations just like in Live Preview and Reading view."
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.markInSourceMode)
          .onChange(async (value) => {
            this.plugin.settings.markInSourceMode = value;
            await this.plugin.saveSettings();
          });
      });

    //* detectCJK
    const detectCJKSetting = new Setting(containerEl)
      .setName(
        "Enable abbreviation detection for languages not separated by spaces"
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.detectCJK)
          .onChange(async (value) => {
            this.plugin.settings.detectCJK = value;
            await this.plugin.saveSettings();
          });
      });

    const detectCJKDesc = createFragment();
    detectCJKDesc.append(
      "Detect abbreviations in languages that do not use spaces for word segmentation, such as ",
      createEl("abbr", {
        text: "CJK",
        title: "Chinese, Japanese, Korean",
      }),
      "."
    );
    detectCJKSetting.descEl.appendChild(detectCJKDesc);

    //* globalAbbreviations
    const globalAbbreviationsSetting = new Setting(containerEl)
      .setName("Global abbreviations")
      .addButton((button) => {
        button.setButtonText("Manage abbreviations").onClick(() => {
          this.displayGlobalAbbreviations();
        });
      });

    const globalAbbreviationsDesc = createFragment();
    globalAbbreviationsDesc.append(
      "Configure global abbreviations, but their priority is lower than ",
      createEl("a", {
        href: "https://help.obsidian.md/Editing+and+formatting/Properties",
        text: "properties",
      }),
      "."
    );
    globalAbbreviationsSetting.descEl.appendChild(globalAbbreviationsDesc);

    new Setting(containerEl).setName("Markdown extra syntax").setHeading();

    //* useMarkdownExtraSyntax
    const useMarkdownExtraSyntaxSetting = new Setting(containerEl)
      .setName("Enable Markdown Extra syntax support")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.useMarkdownExtraSyntax)
          .onChange(async (value) => {
            this.plugin.settings.useMarkdownExtraSyntax = value;
            await this.plugin.saveSettings();
          });
      });

    const useMarkdownExtraSyntaxDesc = createFragment();
    useMarkdownExtraSyntaxDesc.append(
      "Toggle this setting to enable or disable the feature. Definition format: ",
      createEl("b", {
        text: "*[W3C]: World Wide Web Consortium",
      }),
      "."
    );
    useMarkdownExtraSyntaxSetting.descEl.appendChild(
      useMarkdownExtraSyntaxDesc
    );

    //* useExtraDefinitionDecorator
    new Setting(containerEl)
      .setName("Enable extra definition decorator")
      .setDesc(
        "Display a decorator at the end of the extra definition that this is an abbreviation definition."
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.useExtraDefinitionDecorator)
          .onChange(async (value) => {
            this.plugin.settings.useExtraDefinitionDecorator = value;
            await this.plugin.saveSettings();
          });
      });

    //* extraDefinitionDecoratorOpacity
    new Setting(containerEl)
      .setName("Extra definition decorator opacity")
      .setDesc(
        "Opacity of the extra definition decorator. The value is the form of percentage."
      )
      .addSlider((slider) => {
        slider
          .setLimits(10, 100, 10)
          .setValue(this.plugin.settings.extraDefinitionDecoratorOpacity)
          .onChange(async (value) => {
            this.plugin.settings.extraDefinitionDecoratorOpacity =
              this.isOpacityValue(value) ? value : 20;
            await this.plugin.saveSettings();
          })
          .setDynamicTooltip();
      });

    //* extraDefinitionDecoratorContent
    new Setting(containerEl)
      .setName("Extra definition decorator content")
      .setDesc(
        "Content of the extra definition decorator. Two variables can be used: ${abbr} and ${tooltip}. To introduce certain information of the current definition into the content."
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings.extraDefinitionDecoratorContent)
          .onChange(async (value) => {
            this.plugin.settings.extraDefinitionDecoratorContent = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).setName("Suffixes").setHeading();

    //* detectAffixes
    new Setting(containerEl)
      .setName("Enable detect suffixes")
      .setDesc("Detect supplementary suffixes for abbreviations.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.detectAffixes)
          .onChange(async (value) => {
            this.plugin.settings.detectAffixes = value;
            await this.plugin.saveSettings();
          });
      });

    //* affixes
    const affixesSetting = new Setting(containerEl)
      .setName("Suffix list")
      .addText((text) => {
        text
          .setPlaceholder("A string separated by ,")
          .setValue(this.plugin.settings.affixes)
          .onChange(async (value) => {
            this.plugin.settings.affixes = value.trim();
            await this.plugin.saveSettings();
          });
      });

    const affixesDesc = createFragment();
    affixesDesc.append(
      "The list content uses comma-separated string, for example: ",
      createEl("b", {
        text: "s, es, less",
      }),
      "."
    );
    affixesSetting.descEl.appendChild(affixesDesc);
  }

  displayGlobalAbbreviations(): void {
    const { containerEl } = this;
    manageGlobalAbbreviations(this.plugin, containerEl, () => {
      new Setting(containerEl)
        .setName("Global abbreviations")
        .setHeading()
        .addButton((button) => {
          button.setButtonText("Back").onClick(() => {
            this.display();
          });
        });
    });
  }

  private isOpacityValue(value: number): value is OpacityOptions {
    if (value >= 10 && value <= 100 && value % 10 === 0) {
      return true;
    }
    return false;
  }
}
