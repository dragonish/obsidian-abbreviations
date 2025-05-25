import { Menu } from "obsidian";
import { EditorView } from "@codemirror/view";
import { abbrClassName, extraDefinitionLineClassName } from "../common/data";

type MenuActionCallback = (
  abbr: AbbreviationInstance,
  action: MenuActionType
) => void;

export class AbbreviationContextMenu {
  private menuAction: MenuActionCallback;

  constructor(onMenuAction: MenuActionCallback) {
    this.menuAction = onMenuAction;
  }

  readingViewDomHandlers(evt: MouseEvent) {
    const target = evt.target as HTMLElement;
    if (target && target.classList.contains(abbrClassName)) {
      const abbrType = target.dataset.abbrType as AbbrInstanceType | undefined;
      const abbrKey = target.dataset.abbrKey;

      if (!abbrType || !abbrKey) {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();

      const abbrTitle = target.title;
      const abbrPosition = parseInt(target.dataset.abbrPosition || "") || -1;
      const abbrIns = {
        key: abbrKey,
        type: abbrType,
        title: abbrTitle,
        position: abbrPosition,
      };

      const menu = this.menuGenerator(abbrIns);
      menu.showAtMouseEvent(evt);
    }
  }

  editorViewDomHandlers() {
    return EditorView.domEventHandlers({
      contextmenu: (evt) => {
        const target = evt.target as HTMLElement;
        if (target) {
          if (target.classList.contains(abbrClassName)) {
            const abbrType = target.dataset.abbrType as
              | AbbrInstanceType
              | undefined;
            const abbrKey = target.dataset.abbrKey;

            if (!abbrType || !abbrKey) {
              return false;
            }
            evt.preventDefault();
            evt.stopPropagation();

            const abbrTitle = target.title;
            const abbrPosition =
              parseInt(target.dataset.abbrPosition || "") || -1;
            const abbrIns: AbbreviationInstance = {
              key: abbrKey,
              type: abbrType,
              title: abbrTitle,
              position: abbrPosition,
            };

            const menu = this.menuGenerator(abbrIns);
            menu.showAtMouseEvent(evt);

            return true;
          } else {
            const line = target.closest<HTMLElement>(
              "." + extraDefinitionLineClassName
            );
            if (line) {
              const abbrKey = line.dataset.abbrKey;

              if (!abbrKey) {
                return false;
              }
              evt.preventDefault();
              evt.stopPropagation();

              const abbrTitle = line.dataset.abbrTitle || "";
              const abbrIns: AbbreviationInstance = {
                key: abbrKey,
                type: "extra",
                title: abbrTitle,
                position: -1,
              };

              const menu = this.menuGenerator(abbrIns, true);
              menu.showAtMouseEvent(evt);

              return true;
            }
          }
        }
        return false;
      },
    });
  }

  private menuGenerator(abbr: AbbreviationInstance, isDefinition = false) {
    const menu = new Menu();

    menu.addItem((item) => {
      item
        .setTitle(`Type: ${isDefinition ? "definition" : abbr.type}`)
        .setIcon("type")
        .setDisabled(true);
    });
    menu.addItem((item) => {
      item
        .setTitle(`Text: ${abbr.key}`)
        .setIcon("whole-word")
        .setDisabled(true);
    });
    menu.addItem((item) => {
      item
        .setTitle(`Title: ${abbr.title}`)
        .setIcon("message-square-quote")
        .setDisabled(true);
    });
    if (abbr.type === "extra" && !isDefinition) {
      menu.addItem((item) => {
        item
          .setTitle(`Line: ${abbr.position}`)
          .setIcon("map-pin")
          .setDisabled(true);
      });
    }
    menu.addSeparator();

    if (!isDefinition) {
      menu.addItem((item) =>
        item
          .setTitle("Edit abbreviation")
          .setIcon("square-pen")
          .onClick(() => {
            this.menuAction(abbr, "edit");
          })
      );
    }

    if (abbr.type === "metadata" || abbr.type === "extra") {
      menu.addItem((item) => {
        item
          .setTitle("Add to global abbreviations")
          .setIcon("square-plus")
          .onClick(() => {
            this.menuAction(abbr, "global");
          });
      });
    }

    menu.addSeparator();
    menu.addItem((item) => {
      item
        .setTitle("Copy abbreviation text")
        .setIcon("copy")
        .onClick(() => {
          this.menuAction(abbr, "copy-text");
        });
    });
    if (abbr.title) {
      menu.addItem((item) => {
        item
          .setTitle("Copy abbreviation title")
          .setIcon("copy")
          .onClick(() => {
            this.menuAction(abbr, "copy-title");
          });
      });
    }
    menu.addItem((item) => {
      item
        .setTitle("Copy metadata format definition")
        .setIcon("copy")
        .onClick(() => {
          this.menuAction(abbr, "copy-metadata");
        });
    });
    menu.addItem((item) => {
      item
        .setTitle("Copy extra format definition")
        .setIcon("copy")
        .onClick(() => {
          this.menuAction(abbr, "copy-extra");
        });
    });
    menu.addItem((item) => {
      item
        .setTitle("Copy HTML format definition")
        .setIcon("copy")
        .onClick(() => {
          this.menuAction(abbr, "copy-html");
        });
    });

    return menu;
  }
}
