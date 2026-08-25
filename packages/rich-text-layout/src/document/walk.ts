import { defaultNodeRegistry } from './registry'
import { DocBlock, DocInline, ListItemInfo, NodeKind, NodeRegistry, PMMark, PMNode } from './types'

function kindOf(node: PMNode, registry: NodeRegistry, atRoot = false): NodeKind {
	const spec = registry[node.type]
	if (spec) return spec.kind
	if (node.type === 'text' || typeof node.text === 'string') return 'text'
	// Unknown nodes: anything with block children is a block, a node with no content is an inline
	// leaf (mentions, emoji), and a node with only inline content is a block at the document root
	// (ProseMirror documents hold blocks) but inline anywhere deeper.
	const content = node.content ?? []
	if (content.length === 0) return 'inline'
	if (content.some((child) => isBlockKind(kindOf(child, registry)))) return 'block'
	return atRoot ? 'block' : 'inline'
}

function isBlockKind(kind: NodeKind) {
	return kind === 'block' || kind === 'list' || kind === 'listItem'
}

function collectText(node: PMNode): string {
	if (typeof node.text === 'string') return node.text
	let out = ''
	for (const child of node.content ?? []) out += collectText(child)
	return out
}

/**
 * Walk a ProseMirror JSON document into a tree of blocks with flattened inline content. The
 * walker is schema-agnostic: classification comes from the registry, and anything it doesn't
 * recognise degrades gracefully rather than throwing.
 *
 * @internal
 */
export function walkDocument(doc: PMNode, registry: NodeRegistry = defaultNodeRegistry): DocBlock {
	return walkBlock(doc, [], [], 0, 0, null, registry)
}

function walkBlock(
	node: PMNode,
	path: number[],
	ancestors: PMNode[],
	index: number,
	listDepth: number,
	marker: ListItemInfo | null,
	registry: NodeRegistry
): DocBlock {
	const block: DocBlock = {
		type: node.type,
		node,
		path,
		ancestors,
		index,
		listDepth,
		marker,
		children: [],
		inlines: [],
		anonymous: false,
	}

	const content = node.content ?? []
	const childAncestors = [...ancestors, node]
	const spec = registry[node.type]
	const kind = spec?.kind ?? kindOf(node, registry)

	const atRoot = ancestors.length === 0
	const hasBlockChild = content.some((child) => isBlockKind(kindOf(child, registry, atRoot)))
	if (!hasBlockChild) {
		block.inlines = walkInlines(content, path, childAncestors, registry)
		return block
	}

	// Container block. Inline children mixed in with blocks (not valid ProseMirror, but cheap to
	// survive) are grouped into anonymous blocks.
	let pendingInline: { nodes: PMNode[]; start: number } | null = null
	const flush = () => {
		if (!pendingInline) return
		const anon: DocBlock = {
			type: node.type,
			node: { type: node.type, content: pendingInline.nodes },
			path,
			ancestors,
			index,
			listDepth,
			marker: block.children.length === 0 ? marker : null,
			children: [],
			inlines: walkInlines(
				pendingInline.nodes,
				path,
				childAncestors,
				registry,
				pendingInline.start
			),
			anonymous: true,
		}
		block.children.push(anon)
		pendingInline = null
	}

	const listInfo = kind === 'list' ? getListInfo(node, spec, content, registry) : null
	let itemCounter = 0

	for (let i = 0; i < content.length; i++) {
		const child = content[i]
		const childKind = kindOf(child, registry, atRoot)
		if (!isBlockKind(childKind)) {
			if (!pendingInline) pendingInline = { nodes: [], start: i }
			pendingInline.nodes.push(child)
			continue
		}
		flush()

		let childMarker: ListItemInfo | null = null
		let childListDepth = listDepth
		if (listInfo && childKind === 'listItem') {
			itemCounter++
			childMarker = {
				index: itemCounter,
				value: listInfo.start + itemCounter - 1,
				count: listInfo.count,
				ordered: listInfo.ordered,
				depth: listDepth + 1,
			}
			childListDepth = listDepth + 1
		} else if (listInfo) {
			childListDepth = listDepth + 1
		}

		// The marker attaches to the first block inside the list item. A list item nested
		// directly in another list item's content inherits nothing.
		const inheritedMarker = block.children.length === 0 && kind !== 'list' ? marker : null
		block.children.push(
			walkBlock(
				child,
				[...path, i],
				childAncestors,
				i,
				childListDepth,
				childMarker ?? inheritedMarker,
				registry
			)
		)
	}
	flush()
	return block
}

function getListInfo(
	node: PMNode,
	spec: NodeRegistry[string] | undefined,
	content: PMNode[],
	registry: NodeRegistry
) {
	const startAttr = spec?.startAttr ?? 'start'
	const rawStart = node.attrs?.[startAttr]
	const start = typeof rawStart === 'number' && Number.isFinite(rawStart) ? rawStart : 1
	const count = content.filter((child) => kindOf(child, registry) === 'listItem').length
	return { ordered: spec?.ordered ?? false, start, count }
}

function walkInlines(
	content: PMNode[],
	blockPath: number[],
	ancestors: PMNode[],
	registry: NodeRegistry,
	offset = 0
): DocInline[] {
	const out: DocInline[] = []
	for (let i = 0; i < content.length; i++) {
		const node = content[i]
		const index = offset + i
		const path = [...blockPath, index]
		const spec = registry[node.type]
		const kind = spec?.kind ?? kindOf(node, registry)
		const marks: PMMark[] = node.marks ?? []
		if (kind === 'hardBreak') {
			out.push({ kind: 'hardBreak', node, path, marks })
			continue
		}
		if (kind === 'text') {
			out.push({ kind: 'text', text: node.text ?? '', marks, node, path, ancestors, index })
			continue
		}
		// Inline (or unknown) node: degrade to its text content under its own marks.
		const text = spec?.getText ? spec.getText(node) : collectText(node)
		if (text.length > 0) {
			out.push({ kind: 'text', text, marks, node, path, ancestors, index })
		}
	}
	return out
}
