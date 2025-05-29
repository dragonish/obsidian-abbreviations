import {
  App,
  FrontMatterCache,
  MarkdownView,
  Plugin,
  TFile,
  debounce,
  Editor,
  Notice,
} from "obsidian";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { elementListSelector, extraDefinitionClassName } from "../common/data";
import {
  calcAbbrListFromFrontmatter,
  findAbbrIndexFromFrontmatter,
  findAbbrIndexFromGlobal,
  getAffixList,
  isWord,
  isExtraDefinitions,
} from "../common/tool";
import { Parser } from "../common/parser";
import { contentFormatter, escapeHtml } from "../common/format";
import {
  AbbrViewPlugin,
  abbrDecorationsField,
  editorModeField,
  updateEditorMode,
} from "./view";
import { handlePreviewMarkdown, handlePreviewMarkdownExtra } from "./dom";
import { AbbreviationInputModal } from "./modal";
import { AbbreviationListModal } from "./list";
import { AbbreviationContextMenu } from "./menu";
import { AbbrSettingTab } from "./setting-tab";
import { AbbreviationManagerModal } from "./manager-modal";

interface ObsidianEditor extends Editor {
  cm: EditorView;
}

interface ObsidianCommands {
  executeCommandById(commandId: string): void;
}

interface ObsidianApp extends App {
  commands: ObsidianCommands;
}

const DEFAULT_SETTINGS: AbbrPluginSettings = {
  metadataKeyword: "abbr",
  detectCJK: false,
  detectAffixes: false,
  affixes: "",
  markInSourceMode: false,
  globalAbbreviations: [],
  useMarkdownExtraSyntax: false,
  useExtraDefinitionDecorator: false,
  extraDefinitionDecoratorOpacity: 20,
  extraDefinitionDecoratorContent: "→ ${abbr}",
};

export class AbbrPlugin extends Plugin {
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
        const pList = element.findAll(".el-p > p");
        for (const p of pList) {
          if (p.textContent && isExtraDefinitions(p.textContent)) {
            p.classList.add(extraDefinitionClassName);
          }
        }

        const eleList = element.findAll(elementListSelector);
        if (eleList.length === 0) {
          return;
        }

        const filterEleList = eleList.filter(
          (ele) =>
            ele.nodeName !== "P" ||
            !ele.classList.contains(extraDefinitionClassName)
        );
        if (filterEleList.length === 0) {
          return;
        }

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
          filterEleList,
          parser.abbreviations,
          this.getAffixList(),
          this.settings.detectCJK
        );
      } else {
        const eleList = element.findAll(elementListSelector);
        if (eleList.length === 0) {
          return;
        }

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
          eleList,
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

    // Dom context menu
    const acm = new AbbreviationContextMenu(
      this.abbreviationActionHandler.bind(this)
    );
    this.registerDomEvent(
      this.app.workspace.containerEl,
      "contextmenu",
      acm.readingViewDomHandlers.bind(acm)
    );
    this.registerEditorExtension(acm.editorViewDomHandlers());

    // Register command
    this.addCommand({
      id: "add-abbreviation",
      name: "Add abbreviation",
      checkCallback: (checking) => {
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
      callback: () => {
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
    this.rerenderPreviewMarkdown.bind(this),
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
        this.abbreviationActionHandler.bind(this)
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
          this.sendNotification(`Added metadata abbreviation: ${abbr}.`);
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
            this.sendNotification(
              `Deleted metadata abbreviation: ${abbr.key}.`
            );
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
      this.sendNotification(`Deleted global abbreviation: ${abbr.key}.`);
    }
  }

  private async abbreviationActionHandler(
    abbr: AbbreviationInstance,
    action: MenuActionType
  ) {
    if (action === "edit") {
      if (abbr.type === "extra") {
        const editor = this.app.workspace.activeEditor?.editor;
        if (editor) {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (view) {
            //? "source" for editing view (Live Preview & Source mode),
            //? "preview" for reading view.
            const isReadingView = view.getMode() === "preview";

            //! Toggle reading view to editing view.
            if (isReadingView) {
              (this.app as ObsidianApp).commands.executeCommandById(
                "markdown:toggle-preview"
              );
            }
          }

          const dest = abbr.position - 1;
          editor.setCursor(dest >= 0 ? dest : 0);
        }
      } else {
        new AbbreviationInputModal(this.app, abbr, (abbrKey, abbrTitle, ac) => {
          if (ac === "delete") {
            if (abbr.type === "metadata") {
              this.deleteAbbreviationFromFrontmatter(abbr);
            } else if (abbr.type === "global") {
              this.deleteAbbreviationFromGlobal(abbr);
            }
          } else if (ac === "edit") {
            if (abbr.type === "metadata") {
              this.modifyAbbreviationInFrontmatter(abbr, abbrKey, abbrTitle);
            } else if (abbr.type === "global") {
              this.modifyAbbreviationInGlobal(abbr, abbrKey, abbrTitle);
            }
          }
        }).open();
      }
    } else if (action === "global") {
      this.settings.globalAbbreviations.push({
        key: abbr.key,
        title: abbr.title,
      });
      await this.saveSettings();
      this.sendNotification(`Added ${abbr.key} to global abbreviations.`);
    } else if (action.includes("copy")) {
      let payload = "";
      switch (action) {
        case "copy-text":
          payload = abbr.key;
          break;
        case "copy-title":
          payload = abbr.title;
          break;
        case "copy-metadata":
          payload = `${abbr.key}: ${abbr.title}`;
          break;
        case "copy-extra":
          payload = `*[${abbr.key}]: ${abbr.title}`;
          break;
        case "copy-html":
          payload = `<abbr title="${escapeHtml(abbr.title)}">${escapeHtml(
            abbr.key
          )}</abbr>`;
          break;
      }

      if (payload) {
        try {
          await navigator.clipboard.writeText(payload);
          this.sendNotification("Content has been copied!");
        } catch {
          this.sendNotification("Error: Unable to copy content!");
        }
      } else {
        this.sendNotification("Warn: The copied content is empty!");
      }
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
