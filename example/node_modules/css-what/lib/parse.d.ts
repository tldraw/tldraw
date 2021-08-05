export interface Options {
    /**
     * When false, tag names will not be lowercased.
     * @default true
     */
    lowerCaseAttributeNames?: boolean;
    /**
     * When false, attribute names will not be lowercased.
     * @default true
     */
    lowerCaseTags?: boolean;
    /**
     * When `true`, `xmlMode` implies both `lowerCaseTags` and `lowerCaseAttributeNames` are set to `false`.
     * Also, `ignoreCase` on attributes will not be inferred based on HTML rules anymore.
     * @default false
     */
    xmlMode?: boolean;
}
export declare type Selector = PseudoSelector | PseudoElement | AttributeSelector | TagSelector | UniversalSelector | Traversal;
export interface AttributeSelector {
    type: "attribute";
    name: string;
    action: AttributeAction;
    value: string;
    ignoreCase: boolean | null;
    namespace: string | null;
}
declare type DataType = Selector[][] | null | string;
export interface PseudoSelector {
    type: "pseudo";
    name: string;
    data: DataType;
}
export interface PseudoElement {
    type: "pseudo-element";
    name: string;
}
export interface TagSelector {
    type: "tag";
    name: string;
    namespace: string | null;
}
export interface UniversalSelector {
    type: "universal";
    namespace: string | null;
}
export interface Traversal {
    type: TraversalType;
}
export declare type AttributeAction = "any" | "element" | "end" | "equals" | "exists" | "hyphen" | "not" | "start";
export declare type TraversalType = "adjacent" | "child" | "descendant" | "parent" | "sibling";
/**
 * Checks whether a specific selector is a traversal.
 * This is useful eg. in swapping the order of elements that
 * are not traversals.
 *
 * @param selector Selector to check.
 */
export declare function isTraversal(selector: Selector): selector is Traversal;
/**
 * Parses `selector`, optionally with the passed `options`.
 *
 * @param selector Selector to parse.
 * @param options Options for parsing.
 * @returns Returns a two-dimensional array.
 * The first dimension represents selectors separated by commas (eg. `sub1, sub2`),
 * the second contains the relevant tokens for that selector.
 */
export default function parse(selector: string, options?: Options): Selector[][];
export {};
//# sourceMappingURL=parse.d.ts.map