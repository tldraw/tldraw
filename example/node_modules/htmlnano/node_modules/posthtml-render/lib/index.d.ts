declare namespace render {
  type Options = {
    /**
     * Custom single tags (selfClosing).
     *
     * @default []
     */
    singleTags: string[] | RegExp[];

    /**
     * Closing format for single tag.
     *
     * Formats:
     *
     * tag: `<br></br>`, slash: `<br />`, default: `<br>`
     *
     */
    closingSingleTag: 'tag' | 'slash';

    /**
     * If all attributes should be quoted.
     * Otherwise attributes will be unquoted when allowed.
     *
     * @default true
     */
    quoteAllAttributes: boolean;

    /**
     * Quote style
     *
     * 0 - Smart quotes
     *   <img src="https://example.com/example.png" onload='testFunc("test")'>
     * 1 - Single quotes
     *   <img src='https://example.com/example.png' onload='testFunc("test")'>
     * 2 - double quotes
     *   <img src="https://example.com/example.png" onload="testFunc("test")">
     *
     * @default 2
     */
    quoteStyle: 0 | 1 | 2
  };

  // PostHTML Tree
  type Tree = Node[];
  type Node = NodeText | NodeTag;
  type NodeText = string;
  type NodeTag = {
    tag: string;
    attrs?: Attributes;
    content?: Node[];
  };

  type Attributes = Record<string, string>;
}

/**
 * Render PostHTML Tree to HTML
 * @param tree PostHTML Tree
 * @param options Render options
 * @returns HTML
 */
declare function render(
  tree: render.Tree,
  options?: Partial<render.Options>
): string;

export = render;
