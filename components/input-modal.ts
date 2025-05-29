import { App, Modal, Setting } from "obsidian";
import { isWord } from "../common/tool";

type ModalActionType = "edit" | "delete";
type SubmitCallback = (
  abbr: string,
  tooltip: string,
  action?: ModalActionType
) => void;

export class AbbreviationInputModal extends Modal {
  private selectedText?: string;
  private selectedAbbr?: AbbreviationInstance;
  private onSubmit: SubmitCallback;

  constructor(
    app: App,
    selectedTextOrAbbr: string | AbbreviationInstance,
    onSubmit: SubmitCallback
  ) {
    super(app);
    if (typeof selectedTextOrAbbr === "string") {
      this.selectedText = selectedTextOrAbbr;
    } else {
      this.selectedAbbr = selectedTextOrAbbr;
    }
    this.onSubmit = onSubmit;
  }

  private submitModal(abbr: string, tip: string, action?: ModalActionType) {
    if (abbr) {
      this.close();
      this.onSubmit(abbr, tip, action);
    }
  }

  onOpen() {
    let abbr = "",
      tip = "";

    if (this.selectedAbbr) {
      const { type, key, title } = this.selectedAbbr;
      this.setTitle(`Edit ${type} abbreviation`);

      abbr = key;
      tip = title;
    } else {
      this.setTitle("Add metadata abbreviation");

      if (this.selectedText) {
        const sText = this.selectedText.replace(/\n/, " ").trim();
        if (isWord(sText)) {
          abbr = sText;
        } else {
          tip = sText;
        }
      }
    }

    const { contentEl } = this;

    new Setting(contentEl)
      .setName("Abbreviation:")
      .addText((text) => {
        text
          .setPlaceholder("Short word")
          .setValue(abbr)
          .onChange((value) => {
            abbr = value.trim();
          });

        let isUserTriggered = false;

        text.inputEl.addEventListener("keydown", (evt) => {
          if (evt.key === "Enter") {
            isUserTriggered = true;
          }
        });

        text.inputEl.addEventListener("keyup", (evt) => {
          if (isUserTriggered && evt.key === "Enter") {
            abbr = text.getValue().trim();
            this.submitModal(abbr, tip, "edit");
          }
        });
      })
      .addText((text) => {
        text
          .setPlaceholder("Tooltip")
          .setValue(tip)
          .onChange((value) => {
            tip = value.trim();
          })
          .inputEl.addEventListener("keyup", (evt) => {
            if (evt.key === "Enter") {
              tip = text.getValue().trim();
              this.submitModal(abbr, tip, "edit");
            }
          });
      });

    const buttonSetting = new Setting(contentEl);

    if (this.selectedAbbr) {
      buttonSetting.addButton((btn) => {
        btn
          .setButtonText("Delete")
          .setWarning()
          .onClick(() => {
            this.submitModal(abbr, tip, "delete");
          });
      });
    }

    buttonSetting.addButton((btn) => {
      btn
        .setButtonText("Submit")
        .setCta()
        .onClick(() => {
          this.submitModal(abbr, tip, "edit");
        });
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
