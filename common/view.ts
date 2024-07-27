import {
  ViewUpdate,
  PluginValue,
  EditorView,
  DecorationSet,
  Decoration,
} from "@codemirror/view";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { editorLivePreviewField } from "obsidian";
import { isAbbreviationsEmpty, type AbbreviationInfo } from "./tool";
import { Conversion } from "./conversion";
import { abbrClassName } from "./data";
import { handlePreviewMarkdown } from "./dom";

/** A StateEffect for updating decorations */
const updateAbbrDecorations = StateEffect.define<DecorationSet>();

/** A StateField to manage the decorations */
export const abbrDecorationsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },

  update(decorations, tr) {
    for (const e of tr.effects) {
      if (e.is(updateAbbrDecorations)) {
        // Completely replace old decorations
        return e.value;
      }
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

/** A StateEffect for editor mode */
export const updateEditorMode = StateEffect.define<boolean>();

/** A StateField to manage the editor mode */
export const editorModeField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(updateEditorMode)) {
        return e.value;
      }
    }
    return value;
  },
});

export class AbbrViewPlugin implements PluginValue {
  getAbbrData: () => Promise<AbbreviationInfo[]>;

  constructor(
    view: EditorView,
    getAbbrData: () => Promise<AbbreviationInfo[]>
  ) {
    this.getAbbrData = getAbbrData;
    this.updateDecorations(view, view.state.field(editorLivePreviewField));
  }

  update(update: ViewUpdate) {
    if (
      update.docChanged ||
      update.viewportChanged ||
      update.transactions.some((tr) =>
        tr.effects.some((e) => e.is(updateEditorMode))
      )
    ) {
      this.updateDecorations(
        update.view,
        update.state.field(editorLivePreviewField)
      );
    }
  }

  destroy() {
    // Cleanup if needed
  }

  private async updateDecorations(view: EditorView, isLivePreviwMode: boolean) {
    const abbrData = await this.getAbbrData();
    if (isAbbreviationsEmpty(abbrData)) {
      return;
    }

    if (isLivePreviwMode) {
      const newDecorations = this.buildDecorations(view, abbrData);
      view.dispatch({
        effects: updateAbbrDecorations.of(newDecorations),
      });

      //? Render Tables and Callouts
      handlePreviewMarkdown(view.dom, abbrData);
    } else {
      view.dispatch({
        effects: updateAbbrDecorations.of(Decoration.none),
      });
    }
  }

  private buildDecorations(
    view: EditorView,
    abbrData: AbbreviationInfo[]
  ): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = view.state.doc;
    const conversion = new Conversion(abbrData);

    for (let i = 1; i < doc.lines + 1; i++) {
      const line = doc.line(i);
      const lineText = line.text;

      if (i === 1 && lineText === "---") {
        conversion.setMetadataState();
        continue;
      }

      const markWords = conversion.handler(lineText);
      markWords.forEach((word) => {
        const from = line.from + word.index;
        const to = from + word.text.length;
        const deco = Decoration.mark({
          tagName: "abbr",
          attributes: {
            text: word.text,
            title: word.title,
            class: abbrClassName,
          },
        });
        builder.add(from, to, deco);
      });
    }

    return builder.finish();
  }
}
