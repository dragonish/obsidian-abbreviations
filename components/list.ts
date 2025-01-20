import { App, FuzzyMatch, FuzzySuggestModal } from "obsidian";
import { AbbreviationInstance } from "../common/data";

type SelectCallback = (abbr: AbbreviationInstance) => void;

export class AbbreviationListModal extends FuzzySuggestModal<AbbreviationInstance> {
  private abbrList: AbbreviationInstance[];
  private selectedText: string;
  private onSelete: SelectCallback;

  constructor(
    app: App,
    abbrList: AbbreviationInstance[],
    selectedText: string,
    onSelect: SelectCallback
  ) {
    super(app);
    this.abbrList = abbrList;
    this.selectedText = selectedText;
    this.onSelete = onSelect;

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
    this.onSelete(abbr);
  }

  renderSuggestion(
    match: FuzzyMatch<AbbreviationInstance>,
    el: HTMLElement
  ): void {
    el.createEl("div", { text: `${match.item.key}: ${match.item.title}` });
    el.createEl("small", {
      text:
        `type: ${match.item.type}` +
        (match.item.position ? ` - postion: ${match.item.position}` : ""),
    });
  }
}
