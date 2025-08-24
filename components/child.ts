import { MarkdownRenderChild, MarkdownPostProcessorContext } from "obsidian";

type DecorationCallback = (
  container: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  fileData?: string
) => void;

type CancelDecorationCallback = (container: HTMLElement) => void;

export class ReadingChild extends MarkdownRenderChild {
  public context: MarkdownPostProcessorContext;
  public container: HTMLElement | null;

  private sourcePath: string;
  private line: number;
  private decorationCallback: DecorationCallback;
  private cancelDecorationCallback: CancelDecorationCallback;

  constructor(
    containerEl: HTMLElement,
    context: MarkdownPostProcessorContext,
    decorationCallback: DecorationCallback,
    cancelDecorationCallback: CancelDecorationCallback
  ) {
    super(containerEl);
    this.container = containerEl;
    this.context = context;
    this.sourcePath = context.sourcePath;
    const sectionInfo = context.getSectionInfo(containerEl);
    this.line = sectionInfo?.lineStart ?? -1;
    this.decorationCallback = decorationCallback;
    this.cancelDecorationCallback = cancelDecorationCallback;
  }

  equal(ele?: HTMLElement | ReadingChild): boolean {
    if (!ele) {
      return false;
    }

    if (ele instanceof ReadingChild) {
      return ele.container == this.container;
    }
    return ele == this.container;
  }

  render(fileData?: string): void {
    if (this.container) {
      this.decorationCallback(this.container, this.context, fileData);
    }
  }

  detach(): void {
    if (this.container) {
      this.cancelDecorationCallback(this.container);
    }
    this.container = null;
  }

  isSamePath(path: string) {
    return this.sourcePath === path;
  }

  updateContext(context: MarkdownPostProcessorContext) {
    if (this.container) {
      const sectionInfo = context.getSectionInfo(this.container);
      if (sectionInfo) {
        const newLine = sectionInfo.lineStart;
        if (this.line !== newLine) {
          this.context = context;
          this.line = newLine;
          this.render();
        } else if (
          !this.deepEqualContext(this.context.frontmatter, context.frontmatter)
        ) {
          this.context = context;
          this.render();
        }
      }
    }
  }

  private deepEqualContext(
    obj1: unknown,
    obj2: unknown,
    visited = new Set()
  ): boolean {
    if (obj1 === obj2) {
      return true;
    }

    if (
      obj1 == null ||
      obj2 == null ||
      typeof obj1 !== "object" ||
      typeof obj2 !== "object"
    ) {
      return false;
    }

    if (visited.has(obj1)) {
      return true;
    }
    visited.add(obj1);

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return false;
      }
      if (
        !this.deepEqualContext(
          obj1[key as keyof typeof obj1],
          obj2[key as keyof typeof obj2],
          visited
        )
      ) {
        return false;
      }
    }

    return true;
  }

  onunload(): void {
    this.container = null;
  }
}
