import { App, Modal, Setting } from "obsidian";
import type { AbbrPlugin } from "./plugin";

export class AbbreviationManagerModal extends Modal {
  private plugin: AbbrPlugin;

  constructor(app: App, plugin: AbbrPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    manageGlobalAbbreviations(this.plugin, contentEl, () => {
      this.setTitle(this.plugin.i18n.t("manager.title"));
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export function manageGlobalAbbreviations(
  plugin: AbbrPlugin,
  containerEl: HTMLElement,
  header: () => void,
) {
  const { i18n } = plugin;
  containerEl.empty();
  header();

  plugin.settings.globalAbbreviations.forEach((abbr, index) => {
    new Setting(containerEl)
      .setName(i18n.t("text.abbrLabel"))
      .addText((text) =>
        text
          .setPlaceholder(i18n.t("text.abbrPlaceholder"))
          .setValue(abbr.key)
          .onChange((value) => {
            plugin.settings.globalAbbreviations[index].key = value.trim();
            plugin.saveSettings();
          }),
      )
      .addText((text) =>
        text
          .setPlaceholder(i18n.t("text.tipPlaceholder"))
          .setValue(abbr.title)
          .onChange((value) => {
            plugin.settings.globalAbbreviations[index].title = value.trim();
            plugin.saveSettings();
          }),
      )
      .addButton((button) =>
        button
          .setButtonText(i18n.t("button.delete"))
          .setWarning()
          .onClick(async () => {
            plugin.settings.globalAbbreviations.splice(index, 1);
            await plugin.saveSettings();
            manageGlobalAbbreviations(plugin, containerEl, header); //! Rerender
          }),
      );
  });

  new Setting(containerEl).addButton((button) =>
    button
      .setButtonText(i18n.t("button.add"))
      .setCta()
      .setTooltip(i18n.t("manager.addTip"))
      .onClick(async () => {
        plugin.settings.globalAbbreviations.push({
          key: "",
          title: "",
        });
        await plugin.saveSettings();
        manageGlobalAbbreviations(plugin, containerEl, header); //! Rerender
      }),
  );
}
