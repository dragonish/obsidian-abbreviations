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
  Modal,
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
} from "./components/view";
import {
  handlePreviewMarkdown,
  handlePreviewMarkdownExtra,
} from "./components/dom";
import { AbbreviationInputModal } from "./components/modal";
import { AbbreviationListModal } from "./components/list";
import {
  calcAbbrListFromFrontmatter,
  findAbbrIndexFromFrontmatter,
  findAbbrIndexFromGlobal,
  getAffixList,
  isWord,
} from "./common/tool";
import { Parser } from "./common/parser";
import { contentFormatter } from "./common/format";

interface ObsidianEditor extends Editor {
  cm: EditorView;
}

const DEFAULT_SETTINGS: AbbrPluginSettings = {
  useMarkdownExtraSyntax: false,
  metadataKeyword: "abbr",
  detectCJK: false,
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

        const file = this.getActiveFile(context.sourcePath);
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
          this.getAffixList(),
          this.settings.detectCJK
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
              const file = this.getActiveFile(context.sourcePath);
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
          this.getAffixList(),
          this.settings.detectCJK
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
              file.path === this.getActiveFile()?.path
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
      id: "add-abbreviation",
      name: "Add abbreviation",
      editorCheckCallback: (checking) => {
        const keywordState = this.settings.metadataKeyword;
        if (keywordState) {
          if (!checking) {
            this.showAddMetaAbbreviationModal();
          }
          return true;
        }
        return false;
      },
    });
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
    this.addCommand({
      id: "list-abbreviations",
      name: "List abbreviations",
      editorCallback: () => {
        this.showAbbreviationListModal();
      },
    });
    this.addCommand({
      id: "manage-global-abbreviations",
      name: "Manage global abbreviations",
      callback: () => {
        this.showManageAbbreviationsModal();
      },
    });

    this.addRibbonIcon("text-search", "List abbreviations", () => {
      this.showAbbreviationListModal();
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
    const abbrList: AbbreviationInstance[] = this.settings.globalAbbreviations
      .map<AbbreviationInstance>(({ key, title }) => ({
        key,
        title,
        type: "global",
      }))
      .filter((item) => item.key);

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
    const { metadataKeyword, ...other } = this.settings;

    const data: AbbrPluginData = {
      metadataKeyword,
      frontmatterCache: undefined,
      suffixes: this.getAffixList(),
      ...other,
    };

    if (metadataKeyword) {
      const file = this.getActiveFile();
      if (file) {
        data.frontmatterCache =
          this.app.metadataCache.getFileCache(file)?.frontmatter;
      }
    }

    return data;
  }

  getAffixList() {
    return this.settings.detectAffixes
      ? getAffixList(this.settings.affixes)
      : undefined;
  }

  private getActiveFile(sourcePath?: string) {
    if (sourcePath) {
      return this.app.vault.getFileByPath(sourcePath);
    } else {
      return this.app.workspace.getActiveFile();
    }
  }

  private async copyAndFormatContent() {
    const activeFile = this.getActiveFile();
    if (activeFile) {
      const content = await this.app.vault.cachedRead(activeFile);
      const formatContent = contentFormatter(
        content,
        this.settings.globalAbbreviations,
        this.settings.metadataKeyword,
        this.settings.useMarkdownExtraSyntax,
        this.getAffixList(),
        this.settings.detectCJK
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

  private showAddMetaAbbreviationModal() {
    const editor = this.app.workspace.activeEditor?.editor;
    if (editor) {
      const selectedText = editor.getSelection();
      new AbbreviationInputModal(
        this.app,
        selectedText,
        this.addAbbreviationToFrontmatter.bind(this)
      ).open();
    }
  }

  private async showAbbreviationListModal() {
    let abbrList: AbbreviationInstance[] = [];
    let selectedText = "";

    const file = this.getActiveFile();
    if (file) {
      const frontmatter =
        this.app.metadataCache.getFileCache(file)?.frontmatter;

      if (this.settings.useMarkdownExtraSyntax) {
        const parser = new Parser(
          this.settings.globalAbbreviations,
          this.settings.metadataKeyword,
          {
            extra: true,
          }
        );
        parser.readAbbreviationsFromCache(frontmatter);

        const sourceContent = await this.app.vault.cachedRead(file);
        sourceContent.split("\n").forEach((line, index) => {
          parser.handler(line, index + 1);
        });

        abbrList = parser.abbreviations;
      } else {
        abbrList = this.getAbbrList(frontmatter);
      }

      const editor = this.app.workspace.activeEditor?.editor;
      if (editor) {
        selectedText = editor.getSelection();
      }

      new AbbreviationListModal(
        this.app,
        abbrList,
        selectedText,
        this.jumpToAbbreviationDefinition.bind(this)
      ).open();
    }
  }

  private showManageAbbreviationsModal() {
    new AbbreviationManagerModal(this.app, this).open();
  }

  private addAbbreviationToFrontmatter(abbr: string, tooltip: string) {
    try {
      this.strictCheckAbbreviationFormat(abbr);
      const metadataKeyword = this.strictGetMetadataKeyword();
      const file = this.strictGetActiveFile();
      this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (this.checkFrontmatter(frontmatter)) {
          const item = `${abbr}: ${tooltip}`;
          if (Array.isArray(frontmatter[metadataKeyword])) {
            frontmatter[metadataKeyword].push(item);
          } else {
            frontmatter[metadataKeyword] = [item];
          }
        }
      });
    } catch (err) {
      this.sendErrorNotification(err);
    }
  }

  private modifyAbbreviationInFrontmatter(
    abbr: AbbreviationInstance,
    newKey: string,
    newTitle: string
  ) {
    try {
      this.strictCheckAbbreviationFormat(newKey);
      const metadataKeyword = this.strictGetMetadataKeyword();
      const file = this.strictGetActiveFile();
      this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (this.checkFrontmatter(frontmatter)) {
          const index = findAbbrIndexFromFrontmatter(
            abbr,
            frontmatter,
            metadataKeyword
          );
          if (index > -1) {
            const item = `${newKey}: ${newTitle}`;
            (frontmatter[metadataKeyword] as unknown[])[index] = item;
          } else {
            this.sendNotFoundWarn();
          }
        }
      });
    } catch (err) {
      this.sendErrorNotification(err);
    }
  }

  private deleteAbbreviationFromFrontmatter(abbr: AbbreviationInstance) {
    try {
      const metadataKeyword = this.strictGetMetadataKeyword();
      const file = this.strictGetActiveFile();
      this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (this.checkFrontmatter(frontmatter)) {
          const index = findAbbrIndexFromFrontmatter(
            abbr,
            frontmatter,
            metadataKeyword
          );
          if (index > -1) {
            (frontmatter[metadataKeyword] as unknown[]).splice(index, 1);
          }
        }
      });
    } catch (err) {
      this.sendErrorNotification(err);
    }
  }

  private modifyAbbreviationInGlobal(
    abbr: AbbreviationInstance,
    newKey: string,
    newTitle: string
  ) {
    if (!isWord(newKey)) {
      this.sendFormatWarn();
      return;
    }

    const index = findAbbrIndexFromGlobal(
      abbr,
      this.settings.globalAbbreviations
    );
    if (index > -1) {
      this.settings.globalAbbreviations[index] = {
        key: newKey,
        title: newTitle,
      };
      this.saveSettings();
    } else {
      this.sendNotFoundWarn();
    }
  }

  private deleteAbbreviationFromGlobal(abbr: AbbreviationInstance) {
    const index = findAbbrIndexFromGlobal(
      abbr,
      this.settings.globalAbbreviations
    );
    if (index > -1) {
      this.settings.globalAbbreviations.splice(index, 1);
      this.saveSettings();
    }
  }

  private jumpToAbbreviationDefinition(abbr: AbbreviationInstance) {
    if (abbr.type === "extra") {
      const editor = this.app.workspace.activeEditor?.editor;
      if (editor) {
        const dest = abbr.position - 1;
        editor.setCursor(dest >= 0 ? dest : 0);
      }
    } else {
      new AbbreviationInputModal(
        this.app,
        abbr,
        (abbrKey, abbrTitle, action) => {
          if (action === "delete") {
            if (abbr.type === "metadata") {
              this.deleteAbbreviationFromFrontmatter(abbr);
            } else if (abbr.type === "global") {
              this.deleteAbbreviationFromGlobal(abbr);
            }
          } else if (action === "edit") {
            if (abbr.type === "metadata") {
              this.modifyAbbreviationInFrontmatter(abbr, abbrKey, abbrTitle);
            } else if (abbr.type === "global") {
              this.modifyAbbreviationInGlobal(abbr, abbrKey, abbrTitle);
            }
          }
        }
      ).open();
    }
  }

  private checkFrontmatter(
    frontmatter: unknown
  ): frontmatter is Record<string, unknown> {
    if (typeof frontmatter === "object" && frontmatter) {
      return true;
    }
    this.sendNotification("Error: Unexpected error!");
    return false;
  }

  private strictCheckAbbreviationFormat(abbr: string) {
    if (!isWord(abbr)) {
      throw new Error("Warn: Abbreviation format is incorrect!");
    }
    return;
  }

  private strictGetMetadataKeyword() {
    const metadataKeyword = this.settings.metadataKeyword;
    if (metadataKeyword) {
      return metadataKeyword;
    }
    throw new Error("Error: Metadata keyword is empty!");
  }

  private strictGetActiveFile() {
    const file = this.getActiveFile();
    if (file) {
      return file;
    }
    throw new Error("Error: No active file found!");
  }

  private sendErrorNotification(err: unknown) {
    if (err instanceof Error) {
      this.sendNotification(err.message);
    }
  }

  private sendFormatWarn() {
    this.sendNotification("Warn: Abbreviation format is incorrect!");
  }

  private sendNotFoundWarn() {
    this.sendNotification("Warn: No original abbreviation found!");
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

    const detectCJKDesc = document.createDocumentFragment();
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
}

class AbbreviationManagerModal extends Modal {
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

function manageGlobalAbbreviations(
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
        button.setButtonText("Delete").onClick(async () => {
          plugin.settings.globalAbbreviations.splice(index, 1);
          await plugin.saveSettings();
          manageGlobalAbbreviations(plugin, containerEl, header); //! Rerender
        })
      );
  });

  new Setting(containerEl).addButton((button) =>
    button
      .setButtonText("Add")
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
