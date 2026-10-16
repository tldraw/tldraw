/**
 * A ProseMirror / TipTap JSON node. This is the shape produced by `node.toJSON()` and stored in
 * tldraw's `richText` props.
 *
 * @public
 */
export interface PMNode {
	type: string
	attrs?: Record<string, unknown>
	content?: PMNode[]
	marks?: PMMark[]
	text?: string
}

/**
 * A ProseMirror / TipTap JSON mark.
 *
 * @public
 */
export interface PMMark {
	type: string
	attrs?: Record<string, unknown>
}

/**
 * How the document walker treats a node type.
 *
 * - `block`: a block-level node. If it contains inline content it is a leaf block (a paragraph);
 *   if it contains blocks it is a container (a blockquote).
 * - `list` / `listItem`: block containers that also drive list markers and counters.
 * - `inline`: an inline node other than text. Its text content (or `getText`) is laid out as if it
 *   were a text node carrying the same marks.
 * - `hardBreak`: a forced line break inside a leaf block.
 * - `text`: a text leaf.
 *
 * @public
 */
export type NodeKind = 'block' | 'inline' | 'list' | 'listItem' | 'hardBreak' | 'text'

/** @public */
export interface NodeSpec {
	kind: NodeKind
	/** For `list` nodes: whether list items are numbered. */
	ordered?: boolean
	/** For `list` nodes: the attribute holding the first counter value. Defaults to `start`. */
	startAttr?: string
	/**
	 * For `inline` nodes: the text to lay out in place of the node. Defaults to the concatenated
	 * text of its descendants.
	 */
	getText?(node: PMNode): string
}

/**
 * Maps node type names to how the layout engine should treat them. Unknown inline nodes degrade
 * to their text content; unknown block nodes degrade to paragraphs.
 *
 * @public
 */
export type NodeRegistry = Readonly<Record<string, NodeSpec>>

/**
 * Per-item list context attached to the blocks directly inside a list item.
 *
 * @public
 */
export interface ListItemInfo {
	/** 1-based position of the item within its list. */
	index: number
	/** The counter value shown by an ordered marker (honours the list's start attribute). */
	value: number
	/** Number of items in the enclosing list. */
	count: number
	ordered: boolean
	/** Nesting depth of the enclosing list, starting at 1. */
	depth: number
}

/**
 * A block in the walked document tree. Leaf blocks carry `inlines`; containers carry `children`.
 *
 * @internal
 */
export interface DocBlock {
	type: string
	node: PMNode
	/** Index path from the document root through `content` arrays. */
	path: number[]
	/** Nodes from the root down to (excluding) this block. */
	ancestors: PMNode[]
	/** Index among the parent's content. */
	index: number
	/** Nesting depth of lists enclosing this block (0 outside any list). */
	listDepth: number
	/** Set on the first block inside a list item: it carries the marker. */
	marker: ListItemInfo | null
	children: DocBlock[]
	inlines: DocInline[]
	/** Whether this block was synthesised to hold inline children of a mixed-content parent. */
	anonymous: boolean
}

/** @internal */
export type DocInline =
	| {
			kind: 'text'
			text: string
			marks: PMMark[]
			node: PMNode
			path: number[]
			ancestors: PMNode[]
			index: number
	  }
	| {
			kind: 'hardBreak'
			node: PMNode
			path: number[]
			marks: PMMark[]
	  }
