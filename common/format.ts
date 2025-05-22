import { Parser } from "./parser";
import { Conversion } from "./conversion";

/**
 * Get formatted line content as an `<abbr>` string.
 * @param content
 * @param marks
 * @returns
 */
export function lineMarkupFormatter(
  content: string,
  marks: MarkItem[]
): string {
  const results: string[] = [];
  let lastIndex = 0;

  marks.forEach((mark) => {
    if (mark.index > lastIndex) {
      results.push(content.substring(lastIndex, mark.index));
    }
    results.push(`<abbr title="${mark.title}">${mark.text}</abbr>`);
    lastIndex = mark.index + mark.text.length;
  });

  if (lastIndex < content.length) {
    results.push(content.substring(lastIndex));
  }

  return results.join("");
}

/**
 * Get formatted note content.
 * @param content
 * @param globalAbbreviations
 * @param metadataKeyword
 * @param useMarkdownExtraSyntax
 * @param affixList
 * @param detectCJK
 * @returns
 */
export function contentFormatter(
  content: string,
  globalAbbreviations: AbbreviationInfo[],
  metadataKeyword: string,
  useMarkdownExtraSyntax: boolean,
  affixList?: string[],
  detectCJK = false
): string {
  const results: string[] = [];
  const parser = new Parser(globalAbbreviations, metadataKeyword, {
    metadata: true,
    extra: useMarkdownExtraSyntax,
  });

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    const lineNum = i + 1;
    parser.handler(lineText, lineNum);

    if (!useMarkdownExtraSyntax && !parser.isMetadataState()) {
      //* No content requiring parses.
      break;
    }
  }

  const conversion = new Conversion(
    parser.abbreviations,
    useMarkdownExtraSyntax,
    affixList,
    detectCJK
  );

  let lastDefinitionState = false;
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    const lineNum = i + 1;

    conversion.handler(lineText, lineNum, (markWords, definition) => {
      if (conversion.isMetadataState()) {
        //* Always excludes metadata content
        return;
      }

      if (lineText === "") {
        if (lastDefinitionState && results.at(-1) === "") {
          //? Remove the blank line used by the definition area
          lastDefinitionState = false;
          return;
        }

        results.push("");
        lastDefinitionState = false;
        return;
      }

      if (definition) {
        // Not includes definition line
        lastDefinitionState = true;
        return;
      }

      if (markWords.length === 0) {
        results.push(lineText);
      } else {
        results.push(lineMarkupFormatter(lineText, markWords));
      }
      lastDefinitionState = false;
    });
  }

  return results.join("\n");
}
