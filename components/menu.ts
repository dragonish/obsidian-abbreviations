import { Menu } from "obsidian";
import { EditorView } from "@codemirror/view";
import { abbrClassName, extraDefinitionLineClassName } from "../common/data";

type MenuActionType = "edit" | "global";
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

      const menu = new Menu();
      const abbrTitle = target.title;
      const abbrPosition = parseInt(target.dataset.abbrPosition || "") || -1;
      const abbrIns = {
        key: abbrKey,
        type: abbrType,
        title: abbrTitle,
        position: abbrPosition,
      };

      menu.addItem((item) => {
        item.setTitle(`Type: ${abbrType}`).setIcon("type").setDisabled(true);
      });
      menu.addItem((item) => {
        item
          .setTitle(`Text: ${abbrKey}`)
          .setIcon("whole-word")
          .setDisabled(true);
      });
      menu.addItem((item) => {
        item
          .setTitle(`Title: ${abbrTitle}`)
          .setIcon("message-square-quote")
          .setDisabled(true);
      });
      menu.addSeparator();

      if (abbrType === "global" || abbrType === "metadata") {
        menu.addItem((item) =>
          item
            .setTitle("Edit abbreviation")
            .setIcon("square-pen")
            .onClick(() => {
              this.menuAction(abbrIns, "edit");
            })
        );
      }

      if (abbrType === "metadata" || abbrType === "extra") {
        menu.addItem((item) => {
          item
            .setTitle("Add to global")
            .setIcon("square-plus")
            .onClick(() => {
              this.menuAction(abbrIns, "global");
            });
        });
      }

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

            const menu = new Menu();
            const abbrTitle = target.title;
            const abbrPosition =
              parseInt(target.dataset.abbrPosition || "") || -1;
            const abbrIns: AbbreviationInstance = {
              key: abbrKey,
              type: abbrType,
              title: abbrTitle,
              position: abbrPosition,
            };

            menu.addItem((item) => {
              item
                .setTitle(`Type: ${abbrType}`)
                .setIcon("type")
                .setDisabled(true);
            });
            menu.addItem((item) => {
              item
                .setTitle(`Text: ${abbrKey}`)
                .setIcon("whole-word")
                .setDisabled(true);
            });
            menu.addItem((item) => {
              item
                .setTitle(`Title: ${abbrTitle}`)
                .setIcon("message-square-quote")
                .setDisabled(true);
            });
            menu.addSeparator();

            menu.addItem((item) =>
              item
                .setTitle("Edit abbreviation")
                .setIcon("square-pen")
                .onClick(() => {
                  this.menuAction(abbrIns, "edit");
                })
            );

            if (abbrType === "metadata" || abbrType === "extra") {
              menu.addItem((item) => {
                item
                  .setTitle("Add to global")
                  .setIcon("square-plus")
                  .onClick(() => {
                    this.menuAction(abbrIns, "global");
                  });
              });
            }

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

              const menu = new Menu();
              const abbrTitle = line.dataset.abbrTitle || "";
              const abbrIns: AbbreviationInstance = {
                key: abbrKey,
                type: "extra",
                title: abbrTitle,
                position: -1,
              };

              menu.addItem((item) => {
                item
                  .setTitle(`Type: definition`)
                  .setIcon("type")
                  .setDisabled(true);
              });
              menu.addItem((item) => {
                item
                  .setTitle(`Text: ${abbrKey}`)
                  .setIcon("whole-word")
                  .setDisabled(true);
              });
              menu.addItem((item) => {
                item
                  .setTitle(`Title: ${abbrTitle}`)
                  .setIcon("message-square-quote")
                  .setDisabled(true);
              });
              menu.addSeparator();
              menu.addSeparator();

              menu.addItem((item) => {
                item
                  .setTitle("Add to global")
                  .setIcon("square-plus")
                  .onClick(() => {
                    this.menuAction(abbrIns, "global");
                  });
              });

              menu.showAtMouseEvent(evt);

              return true;
            }
          }
        }
        return false;
      },
    });
  }
}
