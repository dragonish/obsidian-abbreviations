import { App, Modal, Setting } from "obsidian";
import { isWord } from "./tool";

type SubmitCallback = (abbr: string, tooltip: string) => void;

export class AbbreviationInputModal extends Modal {
  private selectedText: string;
  private onSubmit: SubmitCallback;

  constructor(app: App, selectedText: string, onSubmit: SubmitCallback) {
    super(app);
    this.selectedText = selectedText;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    let abbr = "",
      tip = "";
    const sTest = this.selectedText.replace(/\n/, " ").trim();
    if (isWord(sTest)) {
      abbr = sTest;
    } else {
      tip = sTest;
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
          });
      })
      .addText((text) => {
        text
          .setPlaceholder("Tooltip")
          .setValue(tip)
          .onChange((value) => {
            tip = value.trim();
          });
      });

    new Setting(contentEl).addButton((btn) => {
      btn
        .setButtonText("Submit")
        .setCta()
        .onClick(() => {
          if (abbr) {
            this.close();
            this.onSubmit(abbr, tip);
          }
        });
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
