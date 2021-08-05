type Maybe<T> = void | T;
type MaybeArray<T> = T | T[];

declare namespace PostHTML {
  type StringMatcher = string | RegExp;
  type AttrMatcher = Record<string, StringMatcher>;
  type ContentMatcher =
    | StringMatcher[]
    | {
        tag?: StringMatcher;
        attrs?: AttrMatcher;
        content?: ContentMatcher[];
      };

  export type Matcher<
    TTag extends StringMatcher,
    TAttrs extends Maybe<AttrMatcher>
  > =
    | StringMatcher
    | {
        tag?: TTag;
        attrs?: TAttrs;
        content?: ContentMatcher[];
      };

  export type Expression<
    TTag extends StringMatcher,
    TAttrs extends Maybe<AttrMatcher>
  > = MaybeArray<Matcher<TTag, TAttrs>>;

  export type NodeCallback<
    TTag extends Maybe<string> = Maybe<string>,
    TAttrs extends Maybe<NodeAttributes> = Maybe<NodeAttributes>
  > = (node: Node<TTag, TAttrs>) => MaybeArray<Node | RawNode>;

  export type NodeAttributes = Record<string, Maybe<string>>;

  interface NodeAPI {
    walk: (cb: NodeCallback) => Node;
    match: <
      TTag extends StringMatcher,
      TAttrs extends Maybe<AttrMatcher>,
      TTagResult extends Maybe<string> = TTag extends string
        ? TTag
        : TTag extends void
        ? Maybe<string>
        : string,
      TAttrResult extends Maybe<NodeAttributes> = TAttrs extends void
        ? Maybe<NodeAttributes>
        : {
            [P in keyof TAttrs]: string;
          } &
            NodeAttributes
    >(
      expression: Expression<TTag, TAttrs>,
      cb: NodeCallback<TTagResult, TAttrResult>
    ) => Node<TTagResult, TAttrResult>[];
  }

  export interface RawNode<
    TTag extends Maybe<string> = Maybe<string>,
    TAttrs extends Maybe<NodeAttributes> = Maybe<NodeAttributes>
  > {
    tag: TTag;
    attrs: TAttrs;
    content?: Array<string | RawNode>;
  }

  export interface Node<
    TTag extends Maybe<string> = Maybe<string>,
    TAttrs extends Maybe<NodeAttributes> = Maybe<NodeAttributes>
  > extends NodeAPI, RawNode<TTag, TAttrs> {
    content?: Array<string | Node>;
    options?: Options;
  }

  export interface Options {
    sync?: boolean;
    parser?: Function;
    render?: Function;
    skipParse?: boolean;
  }

  export type Plugin<TThis> = (
    tree: Node
  ) => void | Node | RawNode | ThisType<TThis>;

  export interface Result<TMessage> {
    html: string;
    tree: Node;
    messages: TMessage[];
  }

  export interface PostHTML<TThis, TMessage> {
    version: string;
    name: "";
    plugins: Plugin<TThis>[];
    messages: TMessage[];
    use<TThis>(plugins: MaybeArray<Plugin<TThis>>): this;
    process(html: string, options?: Options): Promise<Result<TMessage>>;
  }
}

declare function PostHTML<TThis, TMessage>(
  plugins?: PostHTML.Plugin<TThis>[]
): PostHTML.PostHTML<TThis, TMessage>;

export = PostHTML;
