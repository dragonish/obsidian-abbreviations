import { App, Modal, Setting } from "obsidian";
import { isWord } from "../common/tool";

type SubmitCallback = (abbr: string, tooltip: string) => void;

export class AbbreviationInputModal extends Modal {
  private selectedText: string;
  private onSubmit: SubmitCallback;

  constructor(app: App, selectedText: string, onSubmit: SubmitCallback) {
    super(app);
    this.selectedText = selectedText;
    this.onSubmit = onSubmit;
  }

  private submitModal(abbr: string, tip: string) {
    if (abbr) {
      this.close();
      this.onSubmit(abbr, tip);
    }
  }

  onOpen() {
    let abbr = "",
      tip = "";
    const sText = this.selectedText.replace(/\n/, " ").trim();
    if (isWord(sText)) {
      abbr = sText;
    } else {
      tip = sText;
    }

    this.setTitle("Add abbreviation");

    const { contentEl } = this;

    new Setting(contentEl)
      .setName("Abbreviation:")
      .addText((text) => {
        text
          .setPlaceholder("Short word")
          .setValue(abbr)
          .onChange((value) => {
            abbr = value.trim();
          })
          .inputEl.addEventListener("keyup", (evt) => {
            if (evt.key === "Enter") {
              abbr = text.getValue().trim();
              this.submitModal(abbr, tip);
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
              this.submitModal(abbr, tip);
            }
          });
      });

    new Setting(contentEl).addButton((btn) => {
      btn
        .setButtonText("Submit")
        .setCta()
        .onClick(() => {
          this.submitModal(abbr, tip);
        });
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
