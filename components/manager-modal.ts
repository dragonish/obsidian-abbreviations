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
      this.setTitle("Manage global abbreviations");
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
  header: () => void
) {
  containerEl.empty();
  header();

  plugin.settings.globalAbbreviations.forEach((abbr, index) => {
    new Setting(containerEl)
      .setName("Abbreviation:")
      .addText((text) =>
        text
          .setPlaceholder("Short word")
          .setValue(abbr.key)
          .onChange(async (value) => {
            plugin.settings.globalAbbreviations[index].key = value.trim();
            await plugin.saveSettings();
          })
      )
      .addText((text) =>
        text
          .setPlaceholder("Tooltip")
          .setValue(abbr.title)
          .onChange(async (value) => {
            plugin.settings.globalAbbreviations[index].title = value.trim();
            await plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button
          .setButtonText("Delete")
          .setWarning()
          .onClick(async () => {
            plugin.settings.globalAbbreviations.splice(index, 1);
            await plugin.saveSettings();
            manageGlobalAbbreviations(plugin, containerEl, header); //! Rerender
          })
      );
  });

  new Setting(containerEl).addButton((button) =>
    button
      .setButtonText("Add")
      .setCta()
      .setTooltip("Add new abbreviation")
      .onClick(async () => {
        plugin.settings.globalAbbreviations.push({
          key: "",
          title: "",
        });
        await plugin.saveSettings();
        manageGlobalAbbreviations(plugin, containerEl, header); //! Rerender
      })
  );
}
