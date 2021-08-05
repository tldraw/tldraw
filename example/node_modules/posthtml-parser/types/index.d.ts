import { ParserOptions } from 'htmlparser2';

declare const parser: (html: string, options?: Options) => Node[];

export default parser;

export type Directive = {
  name: string | RegExp;
  start: string;
  end: string;
};

export type Options = {
  directives?: Directive[];
  sourceLocations?: boolean;
} & ParserOptions;

export type Tag = string | boolean;
export type Attributes = Record<string, string | number | boolean>;
export type Content = NodeText | Node[] | Node[][];

export type NodeText = string | number;
export type NodeTag = {
  tag?: Tag;
  attrs?: Attributes;
  content?: Content;
  location?: SourceLocation;
};

export type Node = NodeText | NodeTag;

export type SourceLocation = {
  start: Position;
  end: Position;
};

export type Position = {
  line: number;
  column: number;
};
