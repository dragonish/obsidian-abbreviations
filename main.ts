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
import {
  getWords,
  getAbbreviationInfo,
  queryAbbreviationTitle,
  isAbbreviationsEmpty,
} from "./common/tool";
import type { AbbreviationInfo, MetadataAbbrType } from "./common/tool";
import { abbrClassName } from "./common/data";

interface ObsidianEditor extends Editor {
  cm: EditorView;
}

interface AbbrPluginSettings {
  metadataKeyword: string;
  globalAbbreviations: AbbreviationInfo[];
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
      this.createAbbrViewPlugin(),
    ]);

    // Register markdown post processor
    this.registerMarkdownPostProcessor((element, context) => {
      this.handlePreviewMarkdown(element, context.frontmatter);
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

  private createAbbrViewPlugin() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const plugin = this;
    return ViewPlugin.fromClass(
      class extends AbbrViewPlugin {
        constructor(view: EditorView) {
          super(view, () => plugin.getAbbrData.call(plugin));
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
    const abbrList = Object.assign([], this.settings.globalAbbreviations);

    if (this.settings.metadataKeyword) {
      if (
        frontmatter &&
        Array.isArray(frontmatter[this.settings.metadataKeyword])
      ) {
        const list = frontmatter[
          this.settings.metadataKeyword
        ] as MetadataAbbrType[];
        list.forEach((item) => {
          const abbrInfo = getAbbreviationInfo(item);
          abbrInfo && abbrList.push(abbrInfo);
        });
      }
    }

    return abbrList;
  }

  async getAbbrData(): Promise<AbbreviationInfo[]> {
    let frontmatter: undefined | FrontMatterCache;
    if (this.settings.metadataKeyword) {
      const file = this.app.workspace.getActiveFile();
      if (file) {
        frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      }
    }

    return this.getAbbrList(frontmatter);
  }

  /**
   * Handle preview makrdown.
   * @param element
   * @param frontmatter
   */
  private handlePreviewMarkdown(
    element: HTMLElement,
    frontmatter?: FrontMatterCache
  ) {
    const abbrList = this.getAbbrList(frontmatter);
    if (isAbbreviationsEmpty(abbrList)) {
      return;
    }

    const eleList = element.findAll("p, li, h1, h2, h3, h4, h5, h6, th, td");
    for (const ele of eleList) {
      const childNodes = ele.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        this.replaceWordWithAbbr(node, abbrList);
      }
    }
  }

  /**
   * Replace words with abbreviation elements.
   * @param node
   * @param abbrList
   * @returns
   */
  private replaceWordWithAbbr(node: Node, abbrList: AbbreviationInfo[]) {
    if (["DEL", "EM", "MARK", "STRONG"].includes(node.nodeName)) {
      const childNodes = node.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        this.replaceWordWithAbbr(childNodes[i], abbrList);
      }
    }

    if (node.nodeType !== Node.TEXT_NODE) {
      return;
    }

    const text = node.textContent;
    if (text) {
      const fragment = document.createDocumentFragment();

      const words = getWords(text);
      words.forEach((word) => {
        if (word.isSpecial) {
          fragment.appendChild(document.createTextNode(word.text));
        } else {
          const abbrTitle = queryAbbreviationTitle(word.text, abbrList);
          if (abbrTitle) {
            const abbr = fragment.createEl("abbr", {
              cls: abbrClassName,
              title: abbrTitle,
              text: word.text,
            });
            fragment.appendChild(abbr);
          } else {
            fragment.appendChild(document.createTextNode(word.text));
          }
        }
      });

      node.parentNode?.replaceChild(fragment, node);
    }
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
