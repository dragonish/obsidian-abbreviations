import {
  App,
  FrontMatterCache,
  MarkdownView,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  debounce,
  Editor,
} from "obsidian";
import { EditorView, ViewPlugin } from "@codemirror/view";
import {
  AbbrViewPlugin,
  abbrDecorationsField,
  editorModeField,
  updateEditorMode,
} from "./common/view";
import { calcAbbrList } from "./common/tool";
import type {
  AbbreviationInfo,
  AbbrPluginSettings,
  AbbrPluginData,
} from "./common/tool";
import { handlePreviewMarkdown } from "./common/dom";

interface ObsidianEditor extends Editor {
  cm: EditorView;
}

const DEFAULT_SETTINGS: AbbrPluginSettings = {
  metadataKeyword: "abbr",
  globalAbbreviations: [],
};

export default class AbbrPlugin extends Plugin {
  settings: AbbrPluginSettings;

  async onload() {
    await this.loadSettings();

    // Register editor extension
    this.registerEditorExtension([
      abbrDecorationsField,
      editorModeField,
      this.createAbbrViewPlugin(this.getPluginData.bind(this)),
    ]);

    // Register markdown post processor
    this.registerMarkdownPostProcessor((element, context) => {
      let frontmatter: undefined | FrontMatterCache;
      if (this.settings.metadataKeyword) {
        frontmatter = context.frontmatter;
        if (!frontmatter) {
          //? It may be Tables or Callouts rendered in Live Preview.
          if (
            element.classList.contains("table-cell-wrapper") ||
            element.classList.contains("markdown-rendered")
          ) {
            const file = this.app.workspace.getActiveFile();
            if (file) {
              frontmatter =
                this.app.metadataCache.getFileCache(file)?.frontmatter;
            }
          }
        }
      }

      const abbrList = this.getAbbrList(frontmatter);
      handlePreviewMarkdown(element, abbrList);
    });

    // Listen for metadata changes
    this.registerEvent(
      this.app.metadataCache.on(
        "changed",
        debounce(
          (file) => {
            //! Delay trigger rerender
            if (
              this.settings.metadataKeyword &&
              file &&
              file === this.app.workspace.getActiveFile()
            ) {
              this.rerenderPreviewMarkdown(file);
            }
          },
          250,
          true
        )
      )
    );

    // Listen for editor mode changes
    this.registerEvent(
      this.app.workspace.on(
        "active-leaf-change",
        this.handleModeChange.bind(this)
      )
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", this.handleModeChange.bind(this))
    );

    this.addSettingTab(new AbbrSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    this.debouncedSaveSettings();
  }

  private createAbbrViewPlugin(getPluginData: () => Promise<AbbrPluginData>) {
    return ViewPlugin.fromClass(
      class extends AbbrViewPlugin {
        constructor(view: EditorView) {
          super(view, getPluginData);
        }
      }
    );
  }

  private handleModeChange() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      const editor = view.editor;

      //? "source" for editing view (Live Preview & Source mode),
      //? "preview" for reading view.
      const isLivePreview = view.getMode() === "source";

      //* Get CodeMirror editor instance
      const cmEditor = (editor as ObsidianEditor).cm;
      if (cmEditor) {
        cmEditor.dispatch({
          effects: updateEditorMode.of(isLivePreview),
        });
      }
    }
  }

  private debouncedSaveSettings = debounce(
    async () => {
      this.rerenderPreviewMarkdown();
    },
    1000,
    true
  );

  private getAbbrList(frontmatter?: FrontMatterCache): AbbreviationInfo[] {
    const abbrList: AbbreviationInfo[] = Object.assign(
      [],
      this.settings.globalAbbreviations
    );

    const readList = calcAbbrList(frontmatter, this.settings.metadataKeyword);
    abbrList.push(...readList);
    return abbrList;
  }

  /**
   * Rerender Preview Markdown.
   * @param file
   */
  private rerenderPreviewMarkdown(file?: TFile) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      if (!file || file === view.file) {
        view.previewMode.rerender(true);
      }
    }
  }

  async getPluginData(): Promise<AbbrPluginData> {
    const data: AbbrPluginData = {
      metadataKeyword: this.settings.metadataKeyword,
      globalAbbreviations: [...this.settings.globalAbbreviations],
      frontmatterCache: undefined,
    };

    if (this.settings.metadataKeyword) {
      const file = this.app.workspace.getActiveFile();
      if (file) {
        data.frontmatterCache =
          this.app.metadataCache.getFileCache(file)?.frontmatter;
      }
    }

    return data;
  }
}

class AbbrSettingTab extends PluginSettingTab {
  plugin: AbbrPlugin;

  constructor(app: App, plugin: AbbrPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

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

    const metadataKeywordDesc = document.createDocumentFragment();
    metadataKeywordDesc.append(
      "The key name that reads the abbreviation information from the ",
      createEl("a", {
        href: "https://help.obsidian.md/Editing+and+formatting/Properties",
        text: "properties",
      }),
      "."
    );
    metadataKeywordSetting.descEl.appendChild(metadataKeywordDesc);

    const globalAbbreviationsSetting = new Setting(containerEl)
      .setName("Global abbreviations")
      .addButton((button) => {
        button.setButtonText("Manage abbreviations").onClick(() => {
          this.displayGlobalAbbreviations();
        });
      });

    const globalAbbreviationsDesc = document.createDocumentFragment();
    globalAbbreviationsDesc.append(
      "Configure global abbreviations, but their priority is lower than ",
      createEl("a", {
        href: "https://help.obsidian.md/Editing+and+formatting/Properties",
        text: "properties",
      }),
      "."
    );
    globalAbbreviationsSetting.descEl.appendChild(globalAbbreviationsDesc);
  }

  displayGlobalAbbreviations(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Global abbreviations")
      .setHeading()
      .addButton((button) => {
        button.setButtonText("Back").onClick(() => {
          this.display();
        });
      });

    this.plugin.settings.globalAbbreviations.forEach((abbr, index) => {
      new Setting(containerEl)
        .setName("Abbreviation:")
        .addText((text) =>
          text
            .setPlaceholder("Short word")
            .setValue(abbr.key)
            .onChange(async (value) => {
              this.plugin.settings.globalAbbreviations[index].key =
                value.trim();
              await this.plugin.saveSettings();
            })
        )
        .addText((text) =>
          text
            .setPlaceholder("Tooltip")
            .setValue(abbr.title)
            .onChange(async (value) => {
              this.plugin.settings.globalAbbreviations[index].title =
                value.trim();
              await this.plugin.saveSettings();
            })
        )
        .addButton((button) =>
          button.setButtonText("Delete").onClick(async () => {
            this.plugin.settings.globalAbbreviations.splice(index, 1);
            await this.plugin.saveSettings();
            this.displayGlobalAbbreviations(); //! Rerender the settings page
          })
        );
    });

    new Setting(containerEl).addButton((button) =>
      button
        .setButtonText("Add")
        .setTooltip("Add new abbreviation")
        .onClick(async () => {
          this.plugin.settings.globalAbbreviations.push({
            key: "",
            title: "",
          });
          await this.plugin.saveSettings();
          this.displayGlobalAbbreviations(); //! Rerender the settings page
        })
    );
  }
}
