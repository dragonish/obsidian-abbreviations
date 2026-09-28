import { App, ButtonComponent, Modal, Setting, TextComponent } from "obsidian";
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
    const card = containerEl.createDiv({ cls: "abbreviations-plugin-card" });

    const cardHeader = card.createDiv({
      cls: "abbreviations-plugin-card-header",
    });
    cardHeader.createSpan({
      text: `${i18n.t("text.abbrLabel")} ${index + 1}`,
    });

    new ButtonComponent(cardHeader)
      .setButtonText(i18n.t("button.delete"))
      .setDestructive()
      .onClick(async () => {
        plugin.settings.globalAbbreviations.splice(index, 1);
        await plugin.saveSettings();
        manageGlobalAbbreviations(plugin, containerEl, header); //! Rerender
      });

    const fields = card.createDiv({ cls: "abbreviations-plugin-card-fields" });

    new TextComponent(fields)
      .setPlaceholder(i18n.t("text.abbrPlaceholder"))
      .setValue(abbr.key)
      .onChange(async (value) => {
        plugin.settings.globalAbbreviations[index].key = value.trim();
        await plugin.saveSettings();
      });

    new TextComponent(fields)
      .setPlaceholder(i18n.t("text.tipPlaceholder"))
      .setValue(abbr.title)
      .onChange(async (value) => {
        plugin.settings.globalAbbreviations[index].title = value.trim();
        await plugin.saveSettings();
      });
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
