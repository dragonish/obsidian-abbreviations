import { App, AbstractInputSuggest } from "obsidian";

export class FileSuggest extends AbstractInputSuggest<string> {
  constructor(
    public app: App,
    public textInputEl: HTMLInputElement | HTMLDivElement,
  ) {
    super(app, textInputEl);
  }

  getSuggestions(query: string): string[] {
    const files = this.app.vault.getFiles();
    const queryLower = query.toLowerCase();
    return files
      .map((file) => file.path)
      .filter((path) => path.toLowerCase().includes(queryLower));
  }

  renderSuggestion(value: string, el: HTMLElement) {
    el.setText(value);
  }
}
