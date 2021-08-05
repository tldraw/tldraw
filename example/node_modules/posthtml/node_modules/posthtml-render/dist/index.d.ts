import { NodeText, NodeTag } from 'posthtml-parser';

declare enum quoteStyleEnum {
    Smart = 0,
    Single = 1,
    Double = 2
}
declare enum closingSingleTagOptionEnum {
    tag = "tag",
    slash = "slash",
    default = "default",
    closeAs = "closeAs"
}
declare enum closingSingleTagTypeEnum {
    tag = "tag",
    slash = "slash",
    default = "default"
}
declare type Node = NodeText | NodeTag & {
    closeAs?: closingSingleTagTypeEnum;
};
declare type Options = {
    /**
     * Custom single tags (selfClosing).
     *
     * @default []
     */
    singleTags?: Array<string | RegExp>;
    /**
     * Closing format for single tag.
     *
     * Formats:
     *
     * tag: `<br></br>`, slash: `<br />`, default: `<br>`
     *
     */
    closingSingleTag?: closingSingleTagOptionEnum;
    /**
     * If all attributes should be quoted.
     * Otherwise attributes will be unquoted when allowed.
     *
     * @default true
     */
    quoteAllAttributes?: boolean;
    /**
     * Replaces quotes in attribute values with `&quote;`.
     *
     * @default true
     */
    replaceQuote?: boolean;
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
    quoteStyle?: quoteStyleEnum;
};
declare function render(tree?: Node | Node[], options?: Options): string;

export { Node, Options, closingSingleTagOptionEnum, closingSingleTagTypeEnum, quoteStyleEnum, render };
