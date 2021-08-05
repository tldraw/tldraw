import { ParserOptions } from 'htmlparser2';
import { SourceLocation } from './location-tracker';

declare type Directive = {
    name: string | RegExp;
    start: string;
    end: string;
};
declare type Options = {
    directives?: Directive[];
    sourceLocations?: boolean;
} & ParserOptions;
declare type Tag = string | boolean;
declare type Attributes = Record<string, string | number | boolean>;
declare type Content = NodeText | Array<Node | Node[]>;
declare type NodeText = string | number;
declare type NodeTag = {
    tag?: Tag;
    attrs?: Attributes;
    content?: Content;
    location?: SourceLocation;
};
declare type Node = NodeText | NodeTag;
declare const parser: (html: string, options?: Options) => Node[];

export { Attributes, Content, Directive, Node, NodeTag, NodeText, Options, Tag, parser };
