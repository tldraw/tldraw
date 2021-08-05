import {ParserOptions} from 'htmlparser2';

declare const parser: (html: string, options?: Options) => Node[];

export default parser;

export type Directive = {
  name: string | RegExp;
  start: string;
  end: string;
};

export type Options = {
  directives?: Directive[];
} & ParserOptions;

export type Node = NodeText | NodeTag;
export type NodeText = string;
export type NodeTag = {
  tag?: string | boolean;
  attrs?: Attributes;
  content?: Node[];
};

export type Attributes = Record<string, string>;
