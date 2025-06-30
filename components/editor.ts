import { editorLivePreviewField } from "obsidian";
import {
  ViewUpdate,
  PluginValue,
  EditorView,
  DecorationSet,
  Decoration,
} from "@codemirror/view";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { handlePreviewMarkdown } from "./dom";
import {
  abbrClassName,
  extraAsteriskClassName,
  extraDefinitionLineClassName,
  previewDecoratorClassName,
  sourceDecoratorClassName,
  elementListSelector,
  METADATA_BORDER,
} from "../common/data";
import { Parser } from "../common/parser";
import { Conversion } from "../common/conversion";

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

export class AbbrEditorViewPlugin implements PluginValue {
  getPluginData: () => Promise<AbbrPluginData>;

  constructor(view: EditorView, getPluginData: () => Promise<AbbrPluginData>) {
    this.getPluginData = getPluginData;
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
    const pluginData = await this.getPluginData();

    if (isLivePreviwMode || pluginData.markInSourceMode) {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc;

      const parser = new Parser(
        pluginData.globalAbbreviations,
        pluginData.metadataKeyword,
        {
          metadata: true,
          extra: pluginData.useMarkdownExtraSyntax,
        }
      );

      for (let i = 1; i < doc.lines + 1; i++) {
        const line = doc.line(i);
        const lineText = line.text;

        if (i === 1 && lineText !== METADATA_BORDER) {
          //? For Table Cell
          parser.readAbbreviationsFromCache(pluginData.frontmatterCache);
        }

        parser.handler(lineText, i);

        if (!pluginData.useMarkdownExtraSyntax && !parser.isMetadataState()) {
          //* No content requiring parses.
          break;
        }
      }

      const resAbbreviations = pluginData.globalFileAbbreviations.concat(
        parser.abbreviations
      );

      if (!parser.isAbbreviationsEmpty()) {
        const conversion = new Conversion(
          resAbbreviations,
          pluginData.useMarkdownExtraSyntax,
          pluginData.suffixes,
          pluginData.detectCJK
        );

        for (let i = 1; i < doc.lines + 1; i++) {
          const line = doc.line(i);
          const lineText = line.text;

          conversion.handler(lineText, i, (markWords, definition) => {
            if (definition) {
              const attributes: { [key: string]: string } = {
                class: pluginData.useExtraDefinitionDecorator
                  ? `${extraDefinitionLineClassName} ${
                      isLivePreviwMode
                        ? previewDecoratorClassName
                        : sourceDecoratorClassName
                    }`
                  : extraDefinitionLineClassName,
                "data-abbr-key": definition.key,
                "data-abbr-title": definition.title,
              };
              if (pluginData.useExtraDefinitionDecorator) {
                attributes["data-abbr-decorator"] =
                  pluginData.extraDefinitionDecoratorContent
                    .replaceAll("${abbr}", definition.key)
                    .replaceAll("${tooltip}", definition.title);
                attributes[
                  "data-decorator-opacity"
                ] = `${pluginData.extraDefinitionDecoratorOpacity}%`;
              }

              const lineDeco = Decoration.line({
                attributes,
              });
              builder.add(line.from, line.from, lineDeco);

              if (isLivePreviwMode) {
                //? Hide the asterisks in continuous definition rows in the live preview.
                const deco = Decoration.mark({
                  attributes: {
                    class: extraAsteriskClassName,
                  },
                });
                builder.add(line.from, line.from + 1, deco);
              }
            } else {
              markWords.forEach((word) => {
                const from = line.from + word.index;
                const to = from + word.text.length;
                const deco = Decoration.mark({
                  tagName: "abbr",
                  attributes: {
                    text: word.text,
                    title: word.title,
                    class: abbrClassName,
                    "data-abbr-key": word.key,
                    "data-abbr-type": word.type,
                    "data-abbr-position": (word.position || -1).toString(),
                  },
                });
                builder.add(from, to, deco);
              });
            }
          });
        }
      }

      const newDecorations = builder.finish();

      view.dispatch({
        effects: updateAbbrDecorations.of(newDecorations),
      });

      //? Render Tables and Callouts
      //TODO Unable to obtain the corresponding row number in the rendered Table and Callout views.
      handlePreviewMarkdown(
        view.dom.findAll(elementListSelector),
        resAbbreviations,
        pluginData.suffixes,
        pluginData.detectCJK
      );
    } else {
      view.dispatch({
        effects: updateAbbrDecorations.of(Decoration.none),
      });
    }
  }
}
