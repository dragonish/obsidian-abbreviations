import { App, PluginSettingTab, Setting } from "obsidian";
import type { AbbrPlugin } from "./plugin";
import { manageGlobalAbbreviations } from "./manager-modal";
import { FileSuggest } from "./suggest";

export class AbbrSettingTab extends PluginSettingTab {
  private plugin: AbbrPlugin;

  constructor(app: App, plugin: AbbrPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {
      containerEl,
      plugin: { i18n },
    } = this;

    containerEl.empty();

    //* metadataKeyword
    const metadataKeywordSetting = new Setting(containerEl)
      .setName(i18n.t("setting.metadataKeyword"))
      .addText((text) =>
        text
          .setPlaceholder(i18n.t("setting.metadataKeywordPlaceholder"))
          .setValue(this.plugin.settings.metadataKeyword)
          .onChange((value) => {
            this.plugin.settings.metadataKeyword = value.trim();
            this.plugin.saveSettings();
          }),
      );

    const metadataKeywordDesc = createFragment();
    const metadataKeywordDescTuple = i18n.getPlaceholderTuple(
      "setting.metadataKeywordDesc",
    );
    metadataKeywordDesc.append(
      metadataKeywordDescTuple[0],
      createEl("a", {
        href: "https://help.obsidian.md/Editing+and+formatting/Properties",
        text: i18n.t("setting.properties"),
      }),
      metadataKeywordDescTuple[1],
    );
    metadataKeywordSetting.descEl.appendChild(metadataKeywordDesc);

    //* markInSourceMode
    new Setting(containerEl)
      .setName(i18n.t("setting.markInSourceMode"))
      .setDesc(i18n.t("setting.markInSourceModeDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.markInSourceMode)
          .onChange((value) => {
            this.plugin.settings.markInSourceMode = value;
            this.plugin.saveSettings();
          });
      });

    //* detectCJK
    const detectCJKSetting = new Setting(containerEl)
      .setName(i18n.t("setting.detectCJK"))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.detectCJK).onChange((value) => {
          this.plugin.settings.detectCJK = value;
          this.plugin.saveSettings();
        });
      });

    const detectCJKDesc = createFragment();
    const detectCJKDescTuple = i18n.getPlaceholderTuple(
      "setting.detectCJKDesc",
    );
    detectCJKDesc.append(
      detectCJKDescTuple[0],
      createEl("abbr", {
        text: "CJK",
        title: "Chinese, Japanese, Korean",
      }),
      detectCJKDescTuple[1],
    );
    detectCJKSetting.descEl.appendChild(detectCJKDesc);

    new Setting(containerEl)
      .setName(i18n.t("setting.extraHeading"))
      .setHeading();

    //* useMarkdownExtraSyntax
    const useMarkdownExtraSyntaxSetting = new Setting(containerEl)
      .setName(i18n.t("setting.useMarkdownExtraSyntax"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.useMarkdownExtraSyntax)
          .onChange((value) => {
            this.plugin.settings.useMarkdownExtraSyntax = value;
            this.plugin.saveSettings();
          });
      });

    const useMarkdownExtraSyntaxDesc = createFragment();
    const useMarkdownExtraSyntaxDescTuple = i18n.getPlaceholderTuple(
      "setting.useMarkdownExtraSyntaxDesc",
    );
    useMarkdownExtraSyntaxDesc.append(
      useMarkdownExtraSyntaxDescTuple[0],
      createEl("b", {
        text: "*[W3C]: World Wide Web Consortium",
      }),
      useMarkdownExtraSyntaxDescTuple[1],
    );
    useMarkdownExtraSyntaxSetting.descEl.appendChild(
      useMarkdownExtraSyntaxDesc,
    );

    //* useExtraDefinitionDecorator
    new Setting(containerEl)
      .setName(i18n.t("setting.useExtraDefinitionDecorator"))
      .setDesc(i18n.t("setting.useExtraDefinitionDecoratorDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.useExtraDefinitionDecorator)
          .onChange((value) => {
            this.plugin.settings.useExtraDefinitionDecorator = value;
            this.plugin.saveSettings();
          });
      });

    //* extraDefinitionDecoratorOpacity
    new Setting(containerEl)
      .setName(i18n.t("setting.extraDefinitionDecoratorOpacity"))
      .setDesc(i18n.t("setting.extraDefinitionDecoratorOpacityDesc"))
      .addSlider((slider) => {
        slider
          .setLimits(10, 100, 10)
          .setValue(this.plugin.settings.extraDefinitionDecoratorOpacity)
          .onChange((value) => {
            this.plugin.settings.extraDefinitionDecoratorOpacity =
              this.isOpacityValue(value) ? value : 20;
            this.plugin.saveSettings();
          })
          .setDynamicTooltip();
      });

    //* extraDefinitionDecoratorContent
    new Setting(containerEl)
      .setName(i18n.t("setting.extraDefinitionDecoratorContent"))
      .setDesc(i18n.t("setting.extraDefinitionDecoratorContentDesc"))
      .addText((text) => {
        text
          .setValue(this.plugin.settings.extraDefinitionDecoratorContent)
          .onChange((value) => {
            this.plugin.settings.extraDefinitionDecoratorContent = value;
            this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).setName(i18n.t("setting.global")).setHeading();

    //* globalAbbreviations
    const globalAbbreviationsSetting = new Setting(containerEl)
      .setName(i18n.t("setting.globalAbbreviations"))
      .addButton((button) => {
        button
          .setButtonText(i18n.t("setting.globalAbbreviationsButton"))
          .onClick(() => {
            this.displayGlobalAbbreviations();
          });
      });

    const globalAbbreviationsDesc = createFragment();
    const globalAbbreviationsDescTuple = i18n.getPlaceholderTuple(
      "setting.globalAbbreviationsDesc",
    );
    globalAbbreviationsDesc.append(
      globalAbbreviationsDescTuple[0],
      createEl("a", {
        href: "https://help.obsidian.md/Editing+and+formatting/Properties",
        text: i18n.t("setting.properties"),
      }),
      globalAbbreviationsDescTuple[1],
    );
    globalAbbreviationsSetting.descEl.appendChild(globalAbbreviationsDesc);

    //* globalFile
    new Setting(containerEl)
      .setName(i18n.t("setting.globalFile"))
      .setDesc(i18n.t("setting.globalFileDesc"))
      .addText((text) => {
        text
          .setValue(this.plugin.settings.globalFile || "")
          .onChange((value) => {
            const isChange = this.plugin.settings.globalFile !== value;
            this.plugin.settings.globalFile = value;
            this.plugin.saveSettings(isChange);
          });

        const suggest = new FileSuggest(this.app, text.inputEl);
        suggest.onSelect((value) => {
          const isChange = this.plugin.settings.globalFile !== value;
          text.setValue(value);
          this.plugin.settings.globalFile = value;
          suggest.close();
          this.plugin.saveSettings(isChange);
        });
      });

    new Setting(containerEl)
      .setName(i18n.t("setting.suffixesHeading"))
      .setHeading();

    //* detectAffixes
    new Setting(containerEl)
      .setName(i18n.t("setting.detectAffixes"))
      .setDesc(i18n.t("setting.detectAffixesDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.detectAffixes)
          .onChange((value) => {
            this.plugin.settings.detectAffixes = value;
            this.plugin.saveSettings();
          });
      });

    //* affixes
    const affixesSetting = new Setting(containerEl)
      .setName(i18n.t("setting.affixes"))
      .addText((text) => {
        text
          .setPlaceholder(i18n.t("setting.affixesPlaceholder"))
          .setValue(this.plugin.settings.affixes)
          .onChange((value) => {
            this.plugin.settings.affixes = value.trim();
            this.plugin.saveSettings();
          });
      });

    const affixesDesc = createFragment();
    const affixesDescTuple = i18n.getPlaceholderTuple("setting.affixesDesc");
    affixesDesc.append(
      affixesDescTuple[0],
      createEl("b", {
        text: "s, es, less",
      }),
      affixesDescTuple[1],
    );
    affixesSetting.descEl.appendChild(affixesDesc);
  }

  displayGlobalAbbreviations(): void {
    const {
      containerEl,
      plugin: { i18n },
    } = this;
    manageGlobalAbbreviations(this.plugin, containerEl, () => {
      new Setting(containerEl)
        .setName(i18n.t("setting.globalAbbreviations"))
        .setHeading()
        .addButton((button) => {
          button.setButtonText(i18n.t("button.back")).onClick(() => {
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
