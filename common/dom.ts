import { MarkdownPostProcessorContext } from "obsidian";
import type { AbbreviationInstance } from "./data";
import {
  abbrClassName,
  extraDefinitionClassName,
  elementListSelector,
} from "./data";
import {
  getWords,
  queryAbbreviationTitle,
  isAbbreviationsEmpty,
  isExtraDefinitions,
} from "./tool";

/**
 * Replace words with abbreviation elements.
 * @param node
 * @param abbrList
 * @param lineStart
 * @returns
 */
function replaceWordWithAbbr(
  node: Node,
  abbrList: AbbreviationInstance[],
  lineStart = 1,
  affixList: string[] = []
) {
  if (["DEL", "EM", "MARK", "STRONG"].includes(node.nodeName)) {
    const childNodes = node.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      replaceWordWithAbbr(childNodes[i], abbrList, lineStart, affixList);
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
          affixList
        );
        if (abbrTitle) {
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
 * @param element
 * @param abbrList
 */
export function handlePreviewMarkdown(
  element: HTMLElement,
  abbrList: AbbreviationInstance[],
  affixList: string[] = []
) {
  if (isAbbreviationsEmpty(abbrList)) {
    return;
  }

  const eleList = element.findAll(elementListSelector);
  for (const ele of eleList) {
    const childNodes = ele.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i];
      replaceWordWithAbbr(node, abbrList, 1, affixList);
    }
  }
}

/**
 * Handle preview makrdown (extra version).
 * @param context
 * @param element
 * @param abbrList
 */
export function handlePreviewMarkdownExtra(
  context: MarkdownPostProcessorContext,
  element: HTMLElement,
  abbrList: AbbreviationInstance[],
  affixList: string[] = []
) {
  if (isAbbreviationsEmpty(abbrList)) {
    return;
  }

  const pList = element.findAll(".markdown-preview-section > .el-p > p");
  for (const p of pList) {
    if (p.textContent && isExtraDefinitions(p.textContent)) {
      p.classList.add(extraDefinitionClassName);
    }
  }

  const eleList = element.findAll(elementListSelector);
  for (const ele of eleList) {
    if (
      ele.nodeName === "P" &&
      ele.classList.contains(extraDefinitionClassName)
    ) {
      continue;
    }

    const sectionInfo = context.getSectionInfo(ele);
    const lineStart = sectionInfo?.lineStart || 1;

    const childNodes = ele.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i];
      replaceWordWithAbbr(node, abbrList, lineStart, affixList);
    }
  }
}
