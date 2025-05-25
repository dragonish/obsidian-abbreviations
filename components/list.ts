import { App, FuzzyMatch, FuzzySuggestModal, renderResults } from "obsidian";

type ActionCallback = (
  abbr: AbbreviationInstance,
  action: ListActionType
) => void;

export class AbbreviationListModal extends FuzzySuggestModal<AbbreviationInstance> {
  private abbrList: AbbreviationInstance[];
  private selectedText: string;
  private action: ActionCallback;

  private static ButtonCls = "abbreviations-plugin--list-item-button";

  constructor(
    app: App,
    abbrList: AbbreviationInstance[],
    selectedText: string,
    onAction: ActionCallback
  ) {
    super(app);
    this.abbrList = abbrList;
    this.selectedText = selectedText;
    this.action = onAction;

    this.emptyStateText = "No abbreviations found.";
    this.setPlaceholder("Type the search term");
  }

  onOpen(): void {
    const sText = this.selectedText.replace(/\n/, " ").trim();
    this.inputEl.value = sText;
    //* Always trigger search
    this.inputEl.dispatchEvent(new InputEvent("input"));
  }

  getItems(): AbbreviationInstance[] {
    return this.abbrList;
  }

  getItemText(abbr: AbbreviationInstance): string {
    return `${abbr.key}: ${abbr.title}`;
  }

  onChooseItem(abbr: AbbreviationInstance): void {
    this.action(abbr, "edit");
  }

  renderSuggestion(
    match: FuzzyMatch<AbbreviationInstance>,
    el: HTMLElement
  ): void {
    const mainItem = el.createDiv("abbreviations-plugin-list-item-main");

    const suggestion = mainItem.createSpan(
      "abbreviations-plugin-list-item-suggestion"
    );
    renderResults(
      suggestion,
      `${match.item.key}: ${match.item.title}`,
      match.match
    );

    const buttons = mainItem.createSpan(
      "abbreviations-plugin--list-item-buttons"
    );
    if (match.item.type === "metadata" || match.item.type === "extra") {
      buttons
        .createEl("button", {
          cls: AbbreviationListModal.ButtonCls,
          text: "Global",
          title: "Add it to global abbreviations",
        })
        .onClickEvent((ev) => {
          ev.stopPropagation();
          this.action(match.item, "global");
          this.close();
        });
    }

    el.createEl("small", {
      text:
        `type: ${match.item.type}` +
        (match.item.position ? ` - postion: ${match.item.position}` : ""),
    });
  }
}
