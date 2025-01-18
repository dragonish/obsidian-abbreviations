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
  Notice,
} from "obsidian";
import { EditorView, ViewPlugin } from "@codemirror/view";
import type {
  AbbreviationInstance,
  AbbrPluginSettings,
  AbbrPluginData,
} from "./common/data";
import {
  AbbrViewPlugin,
  abbrDecorationsField,
  editorModeField,
  updateEditorMode,
} from "./common/view";
import { calcAbbrListFromFrontmatter, getAffixList } from "./common/tool";
import {
  handlePreviewMarkdown,
  handlePreviewMarkdownExtra,
} from "./common/dom";
import { Parser } from "./common/parser";
import { contentFormatter } from "./common/format";

interface ObsidianEditor extends Editor {
  cm: EditorView;
}

const DEFAULT_SETTINGS: AbbrPluginSettings = {
  useMarkdownExtraSyntax: false,
  metadataKeyword: "abbr",
  detectAffixes: false,
  affixes: "",
  markInSourceMode: false,
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
    this.registerMarkdownPostProcessor(async (element, context) => {
      if (this.settings.useMarkdownExtraSyntax) {
        const parser = new Parser(
          this.settings.globalAbbreviations,
          this.settings.metadataKeyword,
          {
            extra: true,
          }
        );
        parser.readAbbreviationsFromCache(context.frontmatter);

        const file = this.app.workspace.getActiveFile();
        if (file) {
          const sourceContent = await this.app.vault.cachedRead(file);
          sourceContent.split("\n").forEach((line, index) => {
            parser.handler(line, index + 1);
          });
        }

        handlePreviewMarkdownExtra(
          context,
          element,
          parser.abbreviations,
          this.settings.detectAffixes
            ? getAffixList(this.settings.affixes)
            : undefined
        );
      } else {
        let frontmatter: undefined | FrontMatterCache = context.frontmatter;

        if (this.settings.metadataKeyword) {
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
        handlePreviewMarkdown(
          element,
          abbrList,
          this.settings.detectAffixes
            ? getAffixList(this.settings.affixes)
            : undefined
        );
      }
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

    // Register command
    this.addCommand({
      id: "copy-with-format",
      name: "Copy and format content",
      callback: () => {
        this.copyAndFormatContent();
      },
    });
    this.addCommand({
      id: "insert-extra-definition",
      name: "Insert extra definition",
      editorCheckCallback: (checking) => {
        const extraState = this.settings.useMarkdownExtraSyntax;
        if (extraState) {
          if (!checking) {
            this.insertExtraDefinition();
          }
          return true;
        }
        return false;
      },
    });

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
      //? "source" for editing view (Live Preview & Source mode),
      //? "preview" for reading view.
      const isLivePreview = view.getMode() === "source";

      //* Get CodeMirror editor instance
      const cmEditor = (view.editor as ObsidianEditor).cm;
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

  private getAbbrList(frontmatter?: FrontMatterCache): AbbreviationInstance[] {
    const abbrList: AbbreviationInstance[] =
      this.settings.globalAbbreviations.map(({ key, title }) => ({
        key,
        title,
        type: "global",
      }));

    const readList = calcAbbrListFromFrontmatter(
      frontmatter,
      this.settings.metadataKeyword
    );
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
      useMarkdownExtraSyntax: this.settings.useMarkdownExtraSyntax,
      metadataKeyword: this.settings.metadataKeyword,
      detectAffixes: this.settings.detectAffixes,
      affixes: this.settings.affixes,
      markInSourceMode: this.settings.markInSourceMode,
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

  private async copyAndFormatContent() {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      const content = await this.app.vault.cachedRead(activeFile);
      const formatContent = contentFormatter(
        content,
        this.settings.globalAbbreviations,
        this.settings.metadataKeyword,
        this.settings.useMarkdownExtraSyntax,
        this.settings.detectAffixes
          ? getAffixList(this.settings.affixes)
          : undefined
      );

      try {
        await navigator.clipboard.writeText(formatContent);
        this.sendNotification("Formatted content has been copied!");
      } catch {
        this.sendNotification("Error: Unable to copy content!");
      }
    }
  }

  private insertExtraDefinition() {
    const editor = this.app.workspace.activeEditor?.editor;
    if (editor) {
      const selectedText = editor.getSelection();
      const content = selectedText ? `*[${selectedText}]: ` : "*[]: ";
      const cursor = editor.getCursor();

      // Insert content at cursor position
      if (selectedText) {
        editor.replaceSelection(content);
      } else {
        editor.replaceRange(content, cursor);
      }

      // Move cursor according to situation
      editor.setCursor({
        line: cursor.line,
        ch: cursor.ch + (selectedText ? selectedText.length + 5 : 2),
      });
    }
  }

  private sendNotification(message: string) {
    new Notice(message);
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

    //* useMarkdownExtraSyntax
    const useMarkdownExtraSyntaxSetting = new Setting(containerEl)
      .setName("Enable Markdown Extra syntax support (Experimental)")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.useMarkdownExtraSyntax)
          .onChange(async (value) => {
            this.plugin.settings.useMarkdownExtraSyntax = value;
            await this.plugin.saveSettings();
          });
      });

    const useMarkdownExtraSyntaxDesc = document.createDocumentFragment();
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

    //* globalAbbreviations
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

    const affixesDesc = document.createDocumentFragment();
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
