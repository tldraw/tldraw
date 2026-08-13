import { AdminFileStatsResponseBody } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'

/**
 * Shape props tallied by the board-stats report. These are the enum style props (`StyleProp.defineEnum`
 * in tlschema) plus `align`, their pre-`horizontalAlign` name, which old snapshots still carry. The
 * list is an allowlist rather than "every short string prop" on purpose: it's what keeps a stats
 * report free of anything a user typed or pasted.
 */
const STYLE_PROP_NAMES = [
	'align',
	'arrowheadEnd',
	'arrowheadStart',
	'color',
	'dash',
	'fill',
	'font',
	'geo',
	'horizontalAlign',
	'kind',
	'labelColor',
	'size',
	'spline',
	'textAlign',
	'verticalAlign',
] as const

/** Shapes nest, so a parent chain this long is a corrupted snapshot, not a deeply grouped board. */
const MAX_PARENT_DEPTH = 100

/**
 * A record's `type` as a tally key. Snapshots are read unvalidated, so a broken record can carry no
 * type at all; those go in one bucket rather than becoming a literal `"undefined"` row in the report.
 */
function typeKey(type: unknown): string {
	return typeof type === 'string' ? type : 'unknown'
}

/**
 * Total length of the text in a rich text document, without ever holding the text itself. Rich text
 * is a ProseMirror document (see TLRichText), so the text lives in `text` nodes at arbitrary depth.
 */
export function countRichTextCharacters(node: unknown): number {
	if (!node || typeof node !== 'object') return 0
	const { text, content } = node as { text?: unknown; content?: unknown }
	let total = typeof text === 'string' ? text.length : 0
	if (Array.isArray(content)) {
		for (const child of content) total += countRichTextCharacters(child)
	}
	return total
}

/** The parts of a board-stats report that come from the snapshot itself. */
export type FileSnapshotStats = Pick<
	AdminFileStatsResponseBody,
	'pages' | 'shapes' | 'text' | 'bindings' | 'styles' | 'assets'
> & { recordsByTypeName: Record<string, number> }

/**
 * Counts, tallies, and sizes for the records in a board's snapshot — never their contents. Records
 * are read defensively rather than through the schema's validators: this runs on whatever is
 * actually in R2, including snapshots too old or too broken to parse, which are exactly the ones
 * worth asking about.
 */
export function summarizeSnapshotDocuments(
	documents: RoomSnapshot['documents']
): FileSnapshotStats {
	const pageIds = new Set<string>()
	const shapeIds = new Set<string>()
	const parentIdByShapeId = new Map<string, string>()
	const recordsByTypeName: Record<string, number> = {}
	const shapesByType: Record<string, number> = {}
	const bindingsByType: Record<string, number> = {}
	const assetsByType: Record<string, number> = {}
	const styles: Record<string, Record<string, number>> = {}
	const arrowBindings: Array<{ fromId: unknown; toId: unknown; terminal: unknown }> = []
	// x/y/w/h per shape, for the extent below. Kept until parents are resolved, since a shape's
	// coordinates only mean something once we know whether it sits on a page.
	const boxes: Array<{ id: string; x: number; y: number; w: number; h: number }> = []

	let totalBindings = 0
	let locked = 0
	let rotated = 0
	let shapesWithText = 0
	let totalCharacters = 0
	let longestCharacters = 0
	let assetsTotal = 0
	let assetSizeBytes = 0

	for (const { state } of documents) {
		const record = state as any
		if (!record || typeof record !== 'object') continue
		if (typeof record.typeName === 'string') {
			recordsByTypeName[record.typeName] = (recordsByTypeName[record.typeName] ?? 0) + 1
		}
		switch (record.typeName) {
			case 'page':
				pageIds.add(record.id)
				break
			case 'shape': {
				shapeIds.add(record.id)
				if (typeof record.parentId === 'string') {
					parentIdByShapeId.set(record.id, record.parentId)
				}
				const shapeType = typeKey(record.type)
				shapesByType[shapeType] = (shapesByType[shapeType] ?? 0) + 1
				if (record.isLocked) locked++
				if (record.rotation) rotated++

				const props = record.props ?? {}
				for (const name of STYLE_PROP_NAMES) {
					const value = props[name]
					if (typeof value !== 'string') continue
					const tally = (styles[name] ??= {})
					tally[value] = (tally[value] ?? 0) + 1
				}

				// Shapes carried plain `text` before rich text; old snapshots still have it
				const characters = props.richText
					? countRichTextCharacters(props.richText)
					: typeof props.text === 'string'
						? props.text.length
						: 0
				if (characters > 0) {
					shapesWithText++
					totalCharacters += characters
					longestCharacters = Math.max(longestCharacters, characters)
				}

				boxes.push({
					id: record.id,
					x: typeof record.x === 'number' ? record.x : 0,
					y: typeof record.y === 'number' ? record.y : 0,
					// Only some shapes have a width and height; the rest count as points
					w: typeof props.w === 'number' ? props.w : 0,
					h: typeof props.h === 'number' ? props.h : 0,
				})
				break
			}
			case 'binding': {
				totalBindings++
				const bindingType = typeKey(record.type)
				bindingsByType[bindingType] = (bindingsByType[bindingType] ?? 0) + 1
				if (bindingType === 'arrow') {
					arrowBindings.push({
						fromId: record.fromId,
						toId: record.toId,
						terminal: record.props?.terminal,
					})
				}
				break
			}
			case 'asset': {
				assetsTotal++
				const assetType = typeKey(record.type)
				assetsByType[assetType] = (assetsByType[assetType] ?? 0) + 1
				const size = record.props?.fileSize
				if (typeof size === 'number' && size > 0) assetSizeBytes += size
				break
			}
		}
	}

	// Shapes nest inside frames and groups, so a shape's page sits at the top of its parent chain.
	// Memoized, and capped so a snapshot with a parent cycle can't spin the worker.
	const resolvedByShapeId = new Map<string, { depth: number; pageId: string | null }>()
	function resolveShape(shapeId: string, hops: number): { depth: number; pageId: string | null } {
		const cached = resolvedByShapeId.get(shapeId)
		if (cached) return cached
		const parentId = parentIdByShapeId.get(shapeId)
		let resolved: { depth: number; pageId: string | null }
		if (parentId !== undefined && pageIds.has(parentId)) {
			resolved = { depth: 1, pageId: parentId }
		} else if (
			parentId === undefined ||
			!parentIdByShapeId.has(parentId) ||
			hops >= MAX_PARENT_DEPTH
		) {
			resolved = { depth: 1, pageId: null }
		} else {
			const parent = resolveShape(parentId, hops + 1)
			resolved = { depth: parent.depth + 1, pageId: parent.pageId }
		}
		resolvedByShapeId.set(shapeId, resolved)
		return resolved
	}

	const shapeCountByPageId = new Map<string, number>()
	let maxDepth = 0
	let orphaned = 0
	for (const shapeId of shapeIds) {
		const { depth, pageId } = resolveShape(shapeId, 0)
		maxDepth = Math.max(maxDepth, depth)
		if (pageId === null) {
			orphaned++
		} else {
			shapeCountByPageId.set(pageId, (shapeCountByPageId.get(pageId) ?? 0) + 1)
		}
	}

	let emptyPages = 0
	let maxShapesOnAPage = 0
	for (const pageId of pageIds) {
		const count = shapeCountByPageId.get(pageId) ?? 0
		if (count === 0) emptyPages++
		maxShapesOnAPage = Math.max(maxShapesOnAPage, count)
	}

	// Only shapes parented to a page: a nested shape's x/y is relative to its frame or group, so
	// mixing the two would give a meaningless box. Rotation is ignored — this is the extent of the
	// unrotated boxes, which is all it needs to be for "is this board absurdly spread out".
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const box of boxes) {
		const resolved = resolvedByShapeId.get(box.id)
		if (!resolved || resolved.depth !== 1 || resolved.pageId === null) continue
		minX = Math.min(minX, box.x)
		minY = Math.min(minY, box.y)
		maxX = Math.max(maxX, box.x + box.w)
		maxY = Math.max(maxY, box.y + box.h)
	}
	const extent =
		minX === Infinity ? null : { width: Math.round(maxX - minX), height: Math.round(maxY - minY) }

	// An arrow has one binding per bound terminal, so the terminals seen per arrow say whether it's
	// bound at both ends, one, or neither
	const terminalsByArrowId = new Map<string, Set<string>>()
	let danglingBindings = 0
	for (const binding of arrowBindings) {
		if (typeof binding.toId !== 'string' || !shapeIds.has(binding.toId)) danglingBindings++
		if (typeof binding.fromId !== 'string' || !shapeIds.has(binding.fromId)) continue
		let terminals = terminalsByArrowId.get(binding.fromId)
		if (!terminals) {
			terminals = new Set<string>()
			terminalsByArrowId.set(binding.fromId, terminals)
		}
		if (typeof binding.terminal === 'string') terminals.add(binding.terminal)
	}
	let boundBothEnds = 0
	let boundOneEnd = 0
	for (const terminals of terminalsByArrowId.values()) {
		if (terminals.size >= 2) boundBothEnds++
		else if (terminals.size === 1) boundOneEnd++
	}

	return {
		recordsByTypeName,
		pages: { total: pageIds.size, maxShapesOnAPage, empty: emptyPages },
		shapes: {
			total: shapeIds.size,
			byType: shapesByType,
			maxDepth,
			locked,
			rotated,
			orphaned,
			extent,
		},
		text: { shapesWithText, totalCharacters, longestCharacters },
		bindings: {
			total: totalBindings,
			byType: bindingsByType,
			arrows: {
				boundBothEnds,
				boundOneEnd,
				unbound: Math.max(0, (shapesByType.arrow ?? 0) - boundBothEnds - boundOneEnd),
				dangling: danglingBindings,
			},
		},
		styles,
		assets: { total: assetsTotal, byType: assetsByType, totalSizeBytes: assetSizeBytes },
	}
}
