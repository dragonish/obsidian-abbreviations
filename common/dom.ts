import { abbrClassName } from "./data";
import { getWords, queryAbbreviationTitle, isAbbreviationsEmpty } from "./tool";
import type { AbbreviationInfo } from "./tool";

/**
 * Replace words with abbreviation elements.
 * @param node
 * @param abbrList
 * @returns
 */
function replaceWordWithAbbr(node: Node, abbrList: AbbreviationInfo[]) {
  if (["DEL", "EM", "MARK", "STRONG"].includes(node.nodeName)) {
    const childNodes = node.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      replaceWordWithAbbr(childNodes[i], abbrList);
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
        const abbrTitle = queryAbbreviationTitle(word.text, abbrList);
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
  abbrList: AbbreviationInfo[]
) {
  if (isAbbreviationsEmpty(abbrList)) {
    return;
  }

  const eleList = element.findAll(
    "p, li, h1, h2, h3, h4, h5, h6, th, td, .table-cell-wrapper, .callout-title-inner"
  );
  for (const ele of eleList) {
    const childNodes = ele.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i];
      replaceWordWithAbbr(node, abbrList);
    }
  }
}
