import { MarkdownPostProcessorContext } from "obsidian";
import type { AbbreviationInstance } from "../common/data";
import { abbrClassName } from "../common/data";
import {
  getWords,
  queryAbbreviationTitle,
  isAbbreviationsEmpty,
} from "../common/tool";

/**
 * Replace words with abbreviation elements.
 * @param node
 * @param abbrList
 * @param lineStart
 * @param detectCJK
 * @returns
 */
function replaceWordWithAbbr(
  node: Node,
  abbrList: AbbreviationInstance[],
  lineStart = 1,
  affixList: string[] = [],
  detectCJK = false
) {
  if (["DEL", "EM", "MARK", "STRONG"].includes(node.nodeName)) {
    const childNodes = node.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      replaceWordWithAbbr(
        childNodes[i],
        abbrList,
        lineStart,
        affixList,
        detectCJK
      );
    }
  }

  if (node.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const text = node.textContent;
  if (text) {
    const fragment = document.createDocumentFragment();

    const words = getWords(text);
    words.forEach((word) => {
      if (word.isSpecial) {
        fragment.appendChild(document.createTextNode(word.text));
      } else {
        const abbrTitle = queryAbbreviationTitle(
          word.text,
          abbrList,
          lineStart,
          affixList,
          detectCJK
        );

        if (Array.isArray(abbrTitle)) {
          let lastIndex = 0;
          for (const item of abbrTitle) {
            if (item.index > lastIndex) {
              fragment.appendChild(
                document.createTextNode(
                  word.text.substring(lastIndex, item.index)
                )
              );
            }

            const abbr = fragment.createEl("abbr", {
              cls: abbrClassName,
              title: item.title,
              text: item.text,
            });
            fragment.appendChild(abbr);

            lastIndex = item.index + item.text.length;
          }

          if (lastIndex < word.text.length) {
            fragment.appendChild(
              document.createTextNode(word.text.substring(lastIndex))
            );
          }
        } else if (abbrTitle) {
          const abbr = fragment.createEl("abbr", {
            cls: abbrClassName,
            title: abbrTitle,
            text: word.text,
          });
          fragment.appendChild(abbr);
        } else {
          fragment.appendChild(document.createTextNode(word.text));
        }
      }
    });

    node.parentNode?.replaceChild(fragment, node);
  }
}

/**
 * Handle preview makrdown.
 * @param eleList
 * @param abbrList
 * @param affixList
 * @param detectCJK
 */
export function handlePreviewMarkdown(
  eleList: HTMLElement[],
  abbrList: AbbreviationInstance[],
  affixList: string[] = [],
  detectCJK = false
) {
  if (isAbbreviationsEmpty(abbrList)) {
    return;
  }

  for (const ele of eleList) {
    const childNodes = ele.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i];
      replaceWordWithAbbr(node, abbrList, 1, affixList, detectCJK);
    }
  }
}

/**
 * Handle preview makrdown (extra version).
 * @param context
 * @param eleList
 * @param abbrList
 * @param affixList
 * @param detectCJK
 */
export function handlePreviewMarkdownExtra(
  context: MarkdownPostProcessorContext,
  eleList: HTMLElement[],
  abbrList: AbbreviationInstance[],
  affixList: string[] = [],
  detectCJK = false
) {
  if (isAbbreviationsEmpty(abbrList)) {
    return;
  }

  for (const ele of eleList) {
    const sectionInfo = context.getSectionInfo(ele);
    const lineStart = sectionInfo?.lineStart || 1;

    const childNodes = ele.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i];
      replaceWordWithAbbr(node, abbrList, lineStart, affixList, detectCJK);
    }
  }
}
