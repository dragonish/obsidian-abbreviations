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
import { i18n } from "../locales";
import {
  pListSelector,
  elementListSelector,
  extraDefinitionClassName,
} from "../common/data";
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
  AbbrEditorViewPlugin,
  abbrDecorationsField,
  editorModeField,
  updateEditorMode,
} from "./editor";
import { ReadingChild } from "./child";
import {
  handlePreviewMarkdown,
  handlePreviewMarkdownExtra,
  restoreHTML,
} from "./dom";
import { AbbreviationContextMenu } from "./menu";
import { AbbreviationListModal } from "./list-modal";
import { AbbreviationInputModal } from "./input-modal";
import { AbbreviationManagerModal } from "./manager-modal";
import { AbbrSettingTab } from "./setting-tab";

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
  globalFile: "",
};

export class AbbrPlugin extends Plugin {
  settings: AbbrPluginSettings;
  globalFileAbbreviations: AbbreviationInstance[] = [];
  i18n = i18n;

  private readingComponents: ReadingChild[] = [];

  async onload() {
    await this.loadSettings();

    // Register editor extension
    this.registerEditorExtension([
      abbrDecorationsField,
      editorModeField,
      this.createAbbrViewPlugin(this.getPluginData.bind(this)),
    ]);

    this.app.workspace.onLayoutReady(() => {
      this.parseGlobalFile();
    });

    // Register markdown post processor
    this.registerMarkdownPostProcessor(async (element, context) => {
      let child = this.readingComponents.find((ch) => ch.equal(element));
      if (!child) {
        child = new ReadingChild(
          element,
          context,
          async (container, ctx, fileData) => {
            if (this.settings.useMarkdownExtraSyntax) {
              const pList = container.findAll(pListSelector);
              for (const p of pList) {
                if (p.textContent && isExtraDefinitions(p.textContent)) {
                  p.classList.add(extraDefinitionClassName);
                } else {
                  p.classList.remove(extraDefinitionClassName);
                }
              }

              const eleList = container.findAll(elementListSelector);
              if (eleList.length === 0) {
                return;
              }

              const filterEleList = eleList.filter(
                (ele) =>
                  ele.nodeName !== "P" ||
                  !ele.classList.contains(extraDefinitionClassName),
              );
              if (filterEleList.length === 0) {
                return;
              }

              restoreHTML(filterEleList);

              const parser = new Parser(
                this.settings.globalAbbreviations,
                this.settings.metadataKeyword,
                {
                  extra: true,
                },
              );
              parser.readAbbreviationsFromCache(ctx.frontmatter);

              let sourceContent = fileData || "";
              if (!sourceContent) {
                const file = this.getActiveFile(ctx.sourcePath);
                if (file) {
                  sourceContent = await this.app.vault.cachedRead(file);
                }
              }

              sourceContent.split("\n").forEach((line, index) => {
                parser.handler(line, index + 1);
              });

              handlePreviewMarkdownExtra(
                ctx,
                filterEleList,
                ctx.sourcePath === this.settings.globalFile
                  ? parser.abbreviations
                  : this.globalFileAbbreviations.concat(parser.abbreviations),
                this.getAffixList(),
                this.settings.detectCJK,
              );
            } else {
              const eleList = container.findAll(elementListSelector);
              if (eleList.length === 0) {
                return;
              }

              restoreHTML(eleList);

              let frontmatter: undefined | FrontMatterCache = ctx.frontmatter;
              if (this.settings.metadataKeyword) {
                if (!frontmatter) {
                  //? It may be Tables or Callouts rendered in Live Preview.
                  if (
                    container.classList.contains("table-cell-wrapper") ||
                    container.classList.contains("markdown-rendered")
                  ) {
                    const file = this.getActiveFile(ctx.sourcePath);
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
                ctx.sourcePath === this.settings.globalFile
                  ? abbrList
                  : this.globalFileAbbreviations.concat(abbrList),
                this.getAffixList(),
                this.settings.detectCJK,
              );
            }
          },
          (container) => {
            const pList = container.findAll(pListSelector);
            for (const p of pList) {
              p.classList.remove(extraDefinitionClassName);
            }

            const eleList = container.findAll(elementListSelector);
            restoreHTML(eleList);
          },
        );

        this.readingComponents.push(child);
        context.addChild(child);
        child.register(() => {
          this.readingComponents = this.readingComponents.filter(
            (item) => !item.equal(child),
          );
        });
      }

      child.render();
      const currentPath = context.sourcePath;
      this.readingComponents.forEach((rc) => {
        if (rc.isSamePath(currentPath)) {
          rc.updateContext(context);
        }
      });
    });

    // Listen for metadata changes
    this.registerEvent(
      this.app.metadataCache.on(
        "changed",
        debounce(
          (file, data) => {
            //! Delay trigger rerender
            if (
              this.settings.metadataKeyword &&
              file &&
              file.path === this.getActiveFile()?.path
            ) {
              this.rerenderReadingAbbreviations(file, data);
            }
          },
          250,
          true,
        ),
      ),
    );

    // Listen for editor mode changes
    this.registerEvent(
      this.app.workspace.on(
        "active-leaf-change",
        this.handleModeChange.bind(this),
      ),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", this.handleModeChange.bind(this)),
    );

    // Listen for file changes
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file.path === this.settings.globalFile) {
          this.parseGlobalFile();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file.path === this.settings.globalFile) {
          this.globalFileAbbreviations = [];
        }
      }),
    );

    // Dom context menu
    const acm = new AbbreviationContextMenu(
      this,
      this.abbreviationActionHandler.bind(this),
    );
    this.registerDomEvent(
      this.app.workspace.containerEl,
      "contextmenu",
      acm.readingViewDomHandlers.bind(acm),
    );
    this.registerEditorExtension(acm.editorViewDomHandlers());

    // Register command
    this.addCommand({
      id: "add-abbreviation",
      name: this.i18n.t("command.add"),
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
      name: this.i18n.t("command.copy"),
      callback: () => {
        this.copyAndFormatContent();
      },
    });
    this.addCommand({
      id: "insert-extra-definition",
      name: this.i18n.t("command.insert"),
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
      name: this.i18n.t("command.list"),
      callback: () => {
        this.showAbbreviationListModal();
      },
    });
    this.addCommand({
      id: "manage-global-abbreviations",
      name: this.i18n.t("command.manage"),
      callback: () => {
        this.showManageAbbreviationsModal();
      },
    });

    this.addRibbonIcon("text-search", this.i18n.t("command.list"), () => {
      this.showAbbreviationListModal();
    });

    this.addSettingTab(new AbbrSettingTab(this.app, this));
  }

  onunload() {
    this.unloadReadingComponents();
  }

  private unloadReadingComponents() {
    this.readingComponents.forEach((child) => child.detach());
    this.readingComponents = [];
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(isChangeGlobalFile = false) {
    await this.saveData(this.settings);

    if (isChangeGlobalFile) {
      await this.parseGlobalFile();
    }

    this.debouncedSaveSettings();
  }

  private createAbbrViewPlugin(getPluginData: () => Promise<AbbrPluginData>) {
    return ViewPlugin.fromClass(
      class extends AbbrEditorViewPlugin {
        constructor(view: EditorView) {
          super(view, getPluginData);
        }
      },
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
    true,
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
      this.settings.metadataKeyword,
    );
    abbrList.push(...readList);

    return abbrList;
  }

  /**
   * Rerender Preview Markdown.
   * @param file
   */
  private rerenderPreviewMarkdown(file?: TFile) {
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    leaves.forEach((leaf) => {
      if (leaf.view instanceof MarkdownView) {
        const view = leaf.view;
        if (!file || file === view.file) {
          const oldScroll = view.previewMode.getScroll();
          view.previewMode.rerender(true);
          const newScroll = view.previewMode.getScroll();
          if (newScroll !== oldScroll) {
            window.setTimeout(() => {
              view.previewMode.applyScroll(oldScroll);
            }, 200);
          }
        }
      }
    });
  }

  private rerenderReadingAbbreviations(file: TFile, fileData: string) {
    this.readingComponents.forEach((rc) => {
      if (rc.isSamePath(file.path)) {
        rc.render(fileData);
      }
    });
  }

  async getPluginData(): Promise<AbbrPluginData> {
    const { metadataKeyword, ...other } = this.settings;
    const file = this.getActiveFile();

    const data: AbbrPluginData = {
      metadataKeyword,
      frontmatterCache: undefined,
      suffixes: this.getAffixList(),
      globalFileAbbreviations:
        file?.path === this.settings.globalFile
          ? []
          : this.globalFileAbbreviations,
      ...other,
    };

    if (metadataKeyword) {
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
        this.settings.detectCJK,
      );

      this.copyContent(formatContent);
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
        this,
        selectedText,
        this.addAbbreviationToFrontmatter.bind(this),
      ).open();
    }
  }

  private async showAbbreviationListModal() {
    let abbrList: AbbreviationInstance[];
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
          },
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
        this,
        file.path === this.settings.globalFile
          ? abbrList
          : this.globalFileAbbreviations.concat(abbrList),
        selectedText,
        this.abbreviationActionHandler.bind(this),
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
          this.sendNotification(
            this.i18n.t("notification.metadataAdded", { abbr }),
          );
        }
      });
    } catch (err) {
      this.sendErrorNotification(err);
    }
  }

  private modifyAbbreviationInFrontmatter(
    abbr: AbbreviationInstance,
    newKey: string,
    newTitle: string,
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
            metadataKeyword,
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
            metadataKeyword,
          );
          if (index > -1) {
            (frontmatter[metadataKeyword] as unknown[]).splice(index, 1);
            this.sendNotification(
              this.i18n.t("notification.metadataDeleted", { abbr: abbr.key }),
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
    newTitle: string,
  ) {
    if (!isWord(newKey)) {
      this.sendFormatWarn();
      return;
    }

    const index = findAbbrIndexFromGlobal(
      abbr,
      this.settings.globalAbbreviations,
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
      this.settings.globalAbbreviations,
    );
    if (index > -1) {
      this.settings.globalAbbreviations.splice(index, 1);
      this.saveSettings();
      this.sendNotification(
        this.i18n.t("notification.globalDeleted", { abbr: abbr.key }),
      );
    }
  }

  private async abbreviationActionHandler(
    abbr: AbbreviationInstance,
    action: MenuActionType,
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
                "markdown:toggle-preview",
              );
            }
          }

          const dest = abbr.position - 1;
          editor.setCursor(dest >= 0 ? dest : 0);
        }
      } else if (abbr.type === "global-file") {
        const file = this.app.vault.getFileByPath(
          this.settings.globalFile || "",
        );
        if (!file) {
          this.sendNotification(this.i18n.t("notification.fileNotExistError"));
        } else {
          const leaf = this.app.workspace.getLeaf("tab");
          await leaf.openFile(file, { active: true });

          if (abbr.position && abbr.position > 0) {
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
                    "markdown:toggle-preview",
                  );
                }
              }

              const dest = abbr.position - 1;
              editor.setCursor(dest >= 0 ? dest : 0);
            }
          }
        }
      } else {
        new AbbreviationInputModal(
          this.app,
          this,
          abbr,
          (abbrKey, abbrTitle, ac) => {
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
          },
        ).open();
      }
    } else if (action === "global") {
      this.settings.globalAbbreviations.push({
        key: abbr.key,
        title: abbr.title,
      });
      await this.saveSettings();
      this.sendNotification(
        this.i18n.t("notification.globalAdded", { abbr: abbr.key }),
      );
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
            abbr.key,
          )}</abbr>`;
          break;
      }

      if (payload) {
        this.copyContent(payload);
      } else {
        this.sendNotification(this.i18n.t("notification.copyWarn"));
      }
    }
  }

  private async parseGlobalFile() {
    if (!this.settings.globalFile) {
      this.globalFileAbbreviations = [];
      return;
    }
    const file = this.app.vault.getFileByPath(this.settings.globalFile);
    if (!file) {
      this.globalFileAbbreviations = [];
      return;
    }

    const parser = new Parser([], this.settings.metadataKeyword, {
      metadata: true,
      extra: this.settings.useMarkdownExtraSyntax,
    });

    const sourceContent = await this.app.vault.cachedRead(file);
    sourceContent.split("\n").forEach((line, index) => {
      parser.handler(line, index + 1);
    });

    this.globalFileAbbreviations = parser.abbreviations.map((abbr) => ({
      key: abbr.key,
      title: abbr.title,
      position: abbr.position,
      type: "global-file",
    }));
  }

  private async copyContent(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      this.sendNotification(this.i18n.t("notification.copied"));
    } catch {
      this.sendNotification(this.i18n.t("notification.copyError"));
    }
  }

  private checkFrontmatter(
    frontmatter: unknown,
  ): frontmatter is Record<string, unknown> {
    if (typeof frontmatter === "object" && frontmatter) {
      return true;
    }
    this.sendNotification(this.i18n.t("notification.unexpectedError"));
    return false;
  }

  private strictCheckAbbreviationFormat(abbr: string) {
    if (!isWord(abbr)) {
      throw new Error(this.i18n.t("notification.formatWarn"));
    }
    return;
  }

  private strictGetMetadataKeyword() {
    const metadataKeyword = this.settings.metadataKeyword;
    if (metadataKeyword) {
      return metadataKeyword;
    }
    throw new Error(this.i18n.t("notification.metadataError"));
  }

  private strictGetActiveFile() {
    const file = this.getActiveFile();
    if (file) {
      return file;
    }
    throw new Error(this.i18n.t("notification.fileError"));
  }

  private sendErrorNotification(err: unknown) {
    if (err instanceof Error) {
      this.sendNotification(err.message);
    }
  }

  private sendFormatWarn() {
    this.sendNotification(this.i18n.t("notification.formatWarn"));
  }

  private sendNotFoundWarn() {
    this.sendNotification(this.i18n.t("notification.notFoundWarn"));
  }

  private sendNotification(message: string) {
    new Notice(message);
  }
}
