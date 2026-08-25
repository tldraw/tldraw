import { defaultNodeRegistry } from '../document/registry'
import { DocBlock, ListItemInfo, PMNode } from '../document/types'
import { walkDocument } from '../document/walk'
import { getMeasureContext } from '../measure/install'
import { MeasureContext } from '../measure/types'
import {
	BlockStyleState,
	StyleResolver,
	createStyleResolver,
	makeMatchContext,
} from '../style/stylesheet'
import { ListStyleTypeValue, ResolvedInlineStyle, StyleSheet } from '../style/types'
import { defaultUserAgentStyles } from '../style/userAgent'
import { InlineLine, buildInlineContent, layoutInline } from './inline'
import { LayoutProfile, resolveProfile } from './profile'
import { BlockBox, LayoutOptions, LineBox, TextLayout } from './types'

interface LaidOutBlock {
	block: DocBlock
	state: BlockStyleState
	parent: LaidOutBlock | null
	children: LaidOutBlock[]
	/** Horizontal inset accumulated from ancestors' padding. */
	inset: number
	lines: InlineLine[] | null
	direction: 'ltr' | 'rtl'
	// filled in by the vertical pass
	y: number
	height: number
	x: number
	width: number
}

/**
 * Lay out a ProseMirror JSON document.
 *
 * @public
 */
export function layoutDocument(doc: PMNode, options: LayoutOptions = {}): TextLayout {
	const measure = options.measureContext ?? getMeasureContext()
	const profile = resolveProfile(options.engine, options.profile)
	const registry = options.registry ?? defaultNodeRegistry
	const sheet: StyleSheet = [
		...(options.userAgentStyles === undefined
			? defaultUserAgentStyles
			: (options.userAgentStyles ?? [])),
		...(options.styles ?? []),
	]
	const resolver = createStyleResolver(sheet, measure, options.rootStyle ?? {}, profile)
	const padding = options.padding ?? 0
	const minWidth = Math.max(0, options.minWidth ?? 0)
	const maxWidth = options.maxWidth == null ? Infinity : Math.max(0, options.maxWidth)

	const root = walkDocument(doc, registry)
	const isEmpty = root.children.length === 0 && root.inlines.length === 0

	// Pass 1: resolve styles and find the max-content width, which decides whether anything
	// wraps at all (a `width: max-content; max-width: N` box only wraps when it has to).
	const tree = resolveTree(root, null, resolver, 0)
	let maxContent = 0
	const measureMaxContent = (b: LaidOutBlock) => {
		if (b.children.length > 0) {
			for (const child of b.children) measureMaxContent(child)
			return
		}
		const result = layoutLeaf(b, Infinity, measure, resolver, profile)
		maxContent = Math.max(maxContent, result.maxContentWidth + b.inset)
	}
	if (!isEmpty) measureMaxContent(tree)

	const contentMax = Math.max(maxWidth - padding * 2, 0)
	const wraps = maxContent > contentMax
	const contentWidth = Math.max(wraps ? contentMax : maxContent, minWidth - padding * 2, 0)

	// Pass 2: lay lines out at the final width.
	const layoutLeaves = (b: LaidOutBlock) => {
		if (b.children.length > 0) {
			for (const child of b.children) layoutLeaves(child)
			return
		}
		const result = layoutLeaf(
			b,
			wraps ? contentWidth - b.inset : Infinity,
			measure,
			resolver,
			profile
		)
		b.lines = result.lines
		b.direction = result.direction
	}
	if (!isEmpty) layoutLeaves(tree)

	// Pass 3: stack vertically with margin collapsing, then emit boxes.
	const blocks: BlockBox[] = []
	const lines: LineBox[] = []
	const height = isEmpty ? 0 : stack(tree, padding, padding, contentWidth)
	emit(tree, -1, blocks, lines)

	return {
		width: contentWidth + padding * 2,
		height: height + padding * 2,
		blocks,
		lines,
		maxContentWidth: maxContent + padding * 2,
	}
}

function resolveTree(
	block: DocBlock,
	parent: LaidOutBlock | null,
	resolver: StyleResolver,
	inset: number
): LaidOutBlock {
	const ctx = makeMatchContext(block.node, [], block.ancestors, block.index, block.listDepth)
	const state = block.anonymous ? parent!.state : resolver.resolveBlock(ctx, parent?.state ?? null)
	const laid: LaidOutBlock = {
		block,
		state,
		parent,
		children: [],
		inset,
		lines: null,
		direction: 'ltr',
		y: 0,
		height: 0,
		x: 0,
		width: 0,
	}
	const childInset = inset + (block.anonymous ? 0 : state.style.paddingLeft)
	for (const child of block.children) {
		laid.children.push(resolveTree(child, laid, resolver, childInset))
	}
	return laid
}

function layoutLeaf(
	b: LaidOutBlock,
	maxWidth: number,
	measure: MeasureContext,
	resolver: StyleResolver,
	profile: LayoutProfile
) {
	const style = b.state.style
	const content = buildInlineContent(b.block.inlines, (item) =>
		resolver.resolveInline(
			makeMatchContext(item.node, item.marks, item.ancestors, item.index, b.block.listDepth),
			b.state
		)
	)
	const marker = b.block.marker ? makeMarker(b, b.block.marker) : null
	// The available width is the block's content box: its own padding is part of the box.
	const available = maxWidth === Infinity ? Infinity : Math.max(0, maxWidth - style.paddingLeft)
	const result = layoutInline(content, {
		block: style,
		maxWidth: available,
		measure,
		marker,
		profile,
	})
	return {
		lines: result.lines,
		maxContentWidth: result.maxContentWidth + style.paddingLeft,
		direction: result.direction,
	}
}

function makeMarker(b: LaidOutBlock, info: ListItemInfo) {
	// list-style-type inherits, so the leaf already carries its list's marker style.
	const s = b.state.style
	const text = markerText(s.listStyleType, info)
	if (!text) return null
	const symbol =
		s.listStyleType === 'disc' || s.listStyleType === 'circle' || s.listStyleType === 'square'
			? s.listStyleType
			: undefined
	const style: ResolvedInlineStyle = {
		fontFamily: s.fontFamily,
		fontSize: s.fontSize,
		fontWeight: s.fontWeight,
		fontStyle: s.fontStyle,
		lineHeight: s.lineHeight,
		color: s.color,
		letterSpacing: 0,
		textDecoration: 'none',
		background: null,
		verticalAlign: 'baseline',
		font: s.font,
	}
	return { text, style, path: b.block.path, symbol }
}

function markerText(type: ListStyleTypeValue, info: ListItemInfo): string {
	switch (type) {
		case 'none':
			return ''
		case 'disc':
			return '•'
		case 'circle':
			return '◦'
		case 'square':
			return '▪'
		case 'decimal':
			return `${info.value}.`
		case 'lower-alpha':
			return `${alpha(info.value).toLowerCase()}.`
		case 'upper-alpha':
			return `${alpha(info.value)}.`
		case 'lower-roman':
			return `${roman(info.value).toLowerCase()}.`
		case 'upper-roman':
			return `${roman(info.value)}.`
		default:
			return info.ordered ? `${info.value}.` : '•'
	}
}

function alpha(n: number) {
	let out = ''
	let v = n
	while (v > 0) {
		const r = (v - 1) % 26
		out = String.fromCharCode(65 + r) + out
		v = Math.floor((v - 1) / 26)
	}
	return out || String(n)
}

function roman(n: number) {
	if (n <= 0 || n >= 4000) return String(n)
	const table: [number, string][] = [
		[1000, 'M'],
		[900, 'CM'],
		[500, 'D'],
		[400, 'CD'],
		[100, 'C'],
		[90, 'XC'],
		[50, 'L'],
		[40, 'XL'],
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I'],
	]
	let out = ''
	let v = n
	for (const [value, sym] of table) {
		while (v >= value) {
			out += sym
			v -= value
		}
	}
	return out
}

/**
 * Stack a container's children vertically. Adjacent sibling margins collapse to the larger one,
 * and a child's margin collapses through a parent that has no padding (we model no borders),
 * which is what block formatting contexts do. The root itself is a BFC root, so the first top
 * margin and last bottom margin are contained, not collapsed away.
 */
function stack(root: LaidOutBlock, x: number, y: number, width: number): number {
	root.x = x
	root.width = width
	root.y = y

	const leaves: LaidOutBlock[] = []
	const topMargins = new Map<LaidOutBlock, number>()
	const bottomMargins = new Map<LaidOutBlock, number>()
	collectLeaves(root, leaves, topMargins, bottomMargins, true)

	let cursor = y
	let prevBottom = 0
	let first = true
	for (const leaf of leaves) {
		const top = topMargins.get(leaf) ?? 0
		cursor += first ? top : Math.max(prevBottom, top)
		first = false
		leaf.y = cursor
		const style = leaf.state.style
		let h = 0
		for (const line of leaf.lines ?? []) h += line.height
		leaf.height = Math.max(h, style.minHeight)
		leaf.x = x + leaf.inset
		leaf.width = width - leaf.inset
		cursor += leaf.height
		prevBottom = bottomMargins.get(leaf) ?? 0
	}
	cursor += prevBottom

	// Containers span from their first leaf's top edge to their last leaf's bottom edge.
	const fit = (b: LaidOutBlock): [number, number] => {
		if (b.children.length === 0) return [b.y, b.y + b.height]
		let top = Infinity
		let bottom = -Infinity
		for (const child of b.children) {
			const [t, btm] = fit(child)
			top = Math.min(top, t)
			bottom = Math.max(bottom, btm)
		}
		if (top === Infinity) {
			top = bottom = cursor
		}
		b.y = top
		b.height = bottom - top
		b.x = x + b.inset
		b.width = width - b.inset
		return [top, bottom]
	}
	fit(root)
	root.y = y
	root.height = cursor - y
	root.x = x
	root.width = width
	return cursor - y
}

function collectLeaves(
	b: LaidOutBlock,
	out: LaidOutBlock[],
	topMargins: Map<LaidOutBlock, number>,
	bottomMargins: Map<LaidOutBlock, number>,
	isRoot: boolean
) {
	if (b.children.length === 0) {
		out.push(b)
		topMargins.set(b, Math.max(topMargins.get(b) ?? 0, isRoot ? 0 : b.state.style.marginTop))
		bottomMargins.set(
			b,
			Math.max(bottomMargins.get(b) ?? 0, isRoot ? 0 : b.state.style.marginBottom)
		)
		return
	}
	const start = out.length
	for (const child of b.children) collectLeaves(child, out, topMargins, bottomMargins, false)
	if (isRoot || b.block.anonymous || out.length === start) return
	// Collapse this container's margins through to its first and last leaves. A container
	// with left padding still has no top/bottom padding, so the collapse always happens.
	const firstLeaf = out[start]
	const lastLeaf = out[out.length - 1]
	topMargins.set(firstLeaf, Math.max(topMargins.get(firstLeaf) ?? 0, b.state.style.marginTop))
	bottomMargins.set(
		lastLeaf,
		Math.max(bottomMargins.get(lastLeaf) ?? 0, b.state.style.marginBottom)
	)
}

function emit(b: LaidOutBlock, parentIndex: number, blocks: BlockBox[], lines: LineBox[]) {
	const index = blocks.length
	const box: BlockBox = {
		type: b.block.type,
		path: b.block.path,
		x: b.x,
		y: b.y,
		width: b.width,
		height: b.height,
		style: b.state.style,
		lineStart: lines.length,
		lineEnd: lines.length,
		parent: parentIndex,
	}
	blocks.push(box)

	if (b.children.length > 0) {
		for (const child of b.children) emit(child, index, blocks, lines)
		return
	}

	const style = b.state.style
	const contentX = b.x + style.paddingLeft
	const available = b.width - style.paddingLeft
	let y = b.y
	for (const line of b.lines ?? []) {
		const align = resolveAlign(style.textAlign, b.direction)
		let x = contentX
		if (align === 'center') x = contentX + (available - line.width) / 2
		else if (align === 'right') x = contentX + available - line.width
		else if (align === 'justify' && !line.endsChunk) justify(line, available)
		lines.push({
			blockIndex: index,
			x,
			y,
			width: line.width,
			height: line.height,
			baseline: line.baseline,
			direction: line.direction,
			fragments: line.fragments,
		})
		y += line.height
	}
	box.lineEnd = lines.length
}

/**
 * Spread a line's slack across its interior spaces. Only spaces stretch (CSS `text-justify:
 * auto` for scripts with spaces); the last line of a paragraph and lines before a forced break
 * stay ragged, as in browsers.
 */
function justify(line: InlineLine, available: number) {
	const slack = available - line.width
	if (slack <= 0) return
	const spaces = line.fragments.filter(
		(f) => f.kind === 'space' && f.x + f.width <= line.width + 0.01
	)
	if (spaces.length === 0) return
	const extra = slack / spaces.length
	let shift = 0
	for (const f of line.fragments) {
		if (f.kind === 'marker') continue
		f.x += shift
		if (f.kind === 'space' && spaces.includes(f)) {
			f.width += extra
			shift += extra
		}
	}
	line.width = available
}

function resolveAlign(
	align: string,
	direction: 'ltr' | 'rtl'
): 'left' | 'center' | 'right' | 'justify' {
	if (align === 'justify') return 'justify'
	if (align === 'center') return 'center'
	if (align === 'left') return 'left'
	if (align === 'right') return 'right'
	if (align === 'end') return direction === 'rtl' ? 'left' : 'right'
	return direction === 'rtl' ? 'right' : 'left'
}
