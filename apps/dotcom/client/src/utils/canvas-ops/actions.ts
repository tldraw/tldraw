import { structuredClone } from '@tldraw/utils'
import {
	createBindingId,
	createShapeId,
	DefaultFontFamilies,
	Editor,
	getArrowInfo,
	TLArrowBinding,
	TLArrowShape,
	TLGeoShape,
	TLNoteShape,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	toRichText,
	uniqueId,
} from 'tldraw'
import { pathGeometry } from './pathGeometry'
import type { AgentShapeMeta, ArrowTerminal, Attribution, CanvasAction, CanvasSize } from './schema'

/** Turn a sender-provided id (e.g. "brain-label") into a tldraw shape id. */
export function toShapeId(id: string): TLShapeId {
	return id.startsWith('shape:') ? (id as TLShapeId) : createShapeId(id)
}

/** Strip the `shape:` prefix; senders work in short ids. */
export function fromShapeId(id: TLShapeId): string {
	return id.replace(/^shape:/, '')
}

/**
 * Wait for fonts and a couple of frames so auto-sized text is re-measured. Without this, bounds read
 * straight after a batch reflect fallback-font widths that change once the real font arrives.
 */
export async function settle(editor: Editor): Promise<void> {
	// jsdom has no FontFace API; there is nothing to wait for there.
	if (typeof FontFace === 'function' && 'fonts' in document) {
		await editor.fonts.loadRequiredFontsForCurrentPage()
	}
	if (typeof requestAnimationFrame === 'function') {
		await new Promise<void>((resolve) =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
		)
	}
}

export interface ShapeSummary {
	id: string
	type: string
	x: number
	y: number
	w: number
	h: number
	text?: string
	geo?: string
	color?: string
	/** For arrows: where each end actually is, in page coordinates. */
	arrowEnds?: { start: { x: number; y: number }; end: { x: number; y: number } }
}

/** Page-space summaries of the current page's shapes, used to resolve text and description refs. */
export function describeShapes(editor: Editor): ShapeSummary[] {
	const summaries: ShapeSummary[] = []
	for (const shape of editor.getCurrentPageShapesSorted()) {
		const bounds = editor.getShapePageBounds(shape)
		if (!bounds) continue
		const summary: ShapeSummary = {
			id: fromShapeId(shape.id),
			type: shape.type,
			x: Math.round(bounds.x),
			y: Math.round(bounds.y),
			w: Math.round(bounds.w),
			h: Math.round(bounds.h),
		}
		const text = editor.getShapeUtil(shape).getText(shape)
		if (text) summary.text = text
		const props = shape.props as { geo?: string; color?: string }
		if (props.geo) summary.geo = props.geo
		if (props.color) summary.color = props.color
		if (shape.type === 'arrow') {
			const info = getArrowInfo(editor, shape as TLArrowShape)
			const transform = editor.getShapePageTransform(shape)
			if (info && transform) {
				const start = transform.applyToPoint(info.start.point)
				const end = transform.applyToPoint(info.end.point)
				summary.arrowEnds = {
					start: { x: Math.round(start.x), y: Math.round(start.y) },
					end: { x: Math.round(end.x), y: Math.round(end.y) },
				}
			}
		}
		summaries.push(summary)
	}
	return summaries
}

/** tldraw's geo label font sizes (theme units); default-shape-constants are not exported. */
const LABEL_FONT_SIZES: Record<CanvasSize, number> = { s: 1.125, m: 1.375, l: 1.625, xl: 2 }
export const LABEL_PADDING = 16

/** Measure a geo label at `size` (one line) with the editor's text measurer. */
export function measureLabel(
	editor: Editor,
	text: string,
	size: CanvasSize,
	font = 'draw'
): { w: number; h: number } {
	const measured = editor.textMeasure.measureText(text, {
		fontFamily:
			DefaultFontFamilies[font as keyof typeof DefaultFontFamilies] ?? DefaultFontFamilies.draw,
		fontSize: LABEL_FONT_SIZES[size] * 16,
		lineHeight: 1.35,
		fontWeight: 'normal',
		fontStyle: 'normal',
		maxWidth: null,
		padding: '0px',
	})
	return { w: measured.w, h: measured.h }
}

function resolveTerminal(
	editor: Editor,
	terminal: ArrowTerminal
): { point: { x: number; y: number }; shapeId?: TLShapeId } {
	if ('shapeId' in terminal) {
		const id = toShapeId(terminal.shapeId)
		const bounds = editor.getShapePageBounds(id)
		if (!bounds) throw new Error(`Unknown shape "${terminal.shapeId}"`)
		return { point: bounds.center, shapeId: id }
	}
	return { point: { x: terminal.x, y: terminal.y } }
}

export interface BatchJournal {
	stamp: AgentShapeMeta
	created: TLShapeId[]
}

/** Shapes created through ops on this editor, in order, across batches; backs `{ created }` refs. */
export interface RunMemory {
	created: TLShapeId[]
}
const runMemories = new WeakMap<Editor, RunMemory>()
export function runMemory(editor: Editor): RunMemory {
	let memory = runMemories.get(editor)
	if (!memory) {
		memory = { created: [] }
		runMemories.set(editor, memory)
	}
	return memory
}

function applyAction(
	editor: Editor,
	action: CanvasAction,
	journal: BatchJournal,
	createdIds: string[]
) {
	// Spread into a fresh object literal so it satisfies tldraw's JsonObject meta type.
	const meta = { agent: { ...journal.stamp } }
	const created = (id: TLShapeId) => {
		journal.created.push(id)
		createdIds.push(fromShapeId(id))
	}
	const newId = (id: string | undefined) => {
		const shapeId = id ? toShapeId(id) : createShapeId()
		if (id && editor.getShape(shapeId))
			throw new Error(`Shape "${fromShapeId(shapeId)}" already exists; use a new id`)
		return shapeId
	}

	switch (action.type) {
		case 'create_path': {
			if (!action.closed && action.fill && action.fill !== 'none')
				throw new Error('Only closed paths can be filled')
			const geometry = pathGeometry(action.points, action.closed, action.smooth)
			const id = newId(action.id)
			editor.createShape({
				...geometry,
				id,
				meta,
				props: {
					...geometry.props,
					color: action.color ?? 'black',
					size: action.size ?? 'm',
					dash: action.dash ?? 'draw',
					...(geometry.type === 'draw' ? { fill: action.fill ?? 'none' } : {}),
				},
			} as TLShapePartial)
			created(id)
			return
		}
		case 'duplicate_shape': {
			const source = editor.getShape(toShapeId(action.shapeId))
			if (!source) throw new Error(`Unknown shape "${action.shapeId}"`)
			if (
				source.parentId !== editor.getCurrentPageId() ||
				!['geo', 'text', 'note', 'line', 'draw'].includes(source.type)
			) {
				throw new Error(
					'duplicate supports only top-level boxes, text, notes, lines, and drawings; not groups or arrows'
				)
			}
			if (action.text !== undefined && !('richText' in source.props))
				throw new Error('This shape cannot contain a text label')
			const id = newId(action.id)
			const { index: _index, ...copy } = structuredClone(source)
			delete copy.meta.agentEdit
			editor.createShape({
				...copy,
				id,
				x: action.x,
				y: action.y,
				meta: { ...copy.meta, ...meta },
				props: {
					...copy.props,
					...(action.text !== undefined ? { richText: toRichText(action.text) } : {}),
				},
			} as TLShapePartial)
			created(id)
			return
		}
		case 'create_text': {
			const id = newId(action.id)
			editor.createShape<TLTextShape>({
				id,
				type: 'text',
				x: action.x,
				y: action.y,
				meta,
				props: {
					richText: toRichText(action.text),
					color: action.color ?? 'black',
					size: action.size ?? 'm',
					autoSize: true,
				},
			})
			created(id)
			return
		}
		case 'create_shape': {
			const id = newId(action.id)
			editor.createShape<TLGeoShape>({
				id,
				type: 'geo',
				x: action.x,
				y: action.y,
				meta,
				props: {
					geo: action.geo,
					w: Math.max(1, action.w),
					h: Math.max(1, action.h),
					color: action.color ?? 'black',
					fill: action.fill ?? 'none',
					dash: action.dash ?? 'draw',
					size: action.size ?? 'm',
					...(action.align ? { align: action.align } : {}),
					richText: toRichText(action.text ?? ''),
				},
			})
			created(id)
			return
		}
		case 'create_note': {
			const id = newId(action.id)
			editor.createShape<TLNoteShape>({
				id,
				type: 'note',
				x: action.x,
				y: action.y,
				meta,
				props: {
					richText: toRichText(action.text),
					color: action.color ?? 'yellow',
				},
			})
			created(id)
			return
		}
		case 'create_arrow': {
			const id = newId(action.id)
			const from = resolveTerminal(editor, action.from)
			const to = resolveTerminal(editor, action.to)
			// The arrow's origin is the start point; `start`/`end` are relative to it.
			editor.createShape<TLArrowShape>({
				id,
				type: 'arrow',
				x: from.point.x,
				y: from.point.y,
				meta,
				props: {
					start: { x: 0, y: 0 },
					end: { x: to.point.x - from.point.x, y: to.point.y - from.point.y },
					color: action.color ?? 'black',
					dash: action.dash ?? 'draw',
					richText: toRichText(action.text ?? ''),
				},
			})
			const bindings: Array<Omit<TLArrowBinding, 'meta'>> = []
			for (const [terminal, target] of [
				['start', from],
				['end', to],
			] as const) {
				if (!target.shapeId) continue
				bindings.push({
					id: createBindingId(),
					typeName: 'binding',
					type: 'arrow',
					fromId: id,
					toId: target.shapeId,
					props: {
						terminal,
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: false,
						isPrecise: false,
						snap: 'none',
					},
				})
			}
			if (bindings.length) editor.createBindings(bindings)
			created(id)
			return
		}
		case 'update_shape': {
			const id = toShapeId(action.shapeId)
			const shape = editor.getShape(id)
			if (!shape) throw new Error(`Unknown shape "${action.shapeId}"`)
			const partial: TLShapePartial<TLShape> = { id, type: shape.type }
			if (action.x !== undefined) partial.x = action.x
			if (action.y !== undefined) partial.y = action.y
			const props: Record<string, unknown> = {}
			const current = shape.props as Record<string, unknown>
			if (action.w !== undefined && 'w' in current && shape.type !== 'text') {
				props.w = Math.max(1, action.w)
			}
			if (action.h !== undefined && 'h' in current) props.h = Math.max(1, action.h)
			if (
				shape.type === 'geo' &&
				(action.w !== undefined || action.h !== undefined) &&
				(current.growY as number) > 0
			) {
				props.growY = 0
			}
			// Notes and auto-sized text store their footprint as a uniform scale, not w/h.
			if (
				(shape.type === 'note' || shape.type === 'text') &&
				(action.w !== undefined || action.h !== undefined)
			) {
				const bounds = editor.getShapeGeometry(shape).bounds
				const ratios = [
					action.w === undefined ? Infinity : action.w / bounds.w,
					action.h === undefined ? Infinity : action.h / bounds.h,
				]
				props.scale = (current.scale as number) * Math.max(0.01, Math.min(...ratios))
			}
			if (action.text !== undefined && 'richText' in current) {
				props.richText = toRichText(action.text)
			}
			if (action.color !== undefined && 'color' in current) {
				props.color = action.color
			}
			if (action.fill !== undefined && 'fill' in current) props.fill = action.fill
			if (action.dash !== undefined && 'dash' in current) props.dash = action.dash
			if (action.size !== undefined && 'size' in current) props.size = action.size
			if (Object.keys(props).length) partial.props = props as never
			partial.meta = { ...shape.meta, agentEdit: { ...journal.stamp } }
			editor.updateShape(partial)
			return
		}
		case 'delete_shapes': {
			const ids = action.shapeIds.map(toShapeId).filter((id) => editor.getShape(id))
			if (ids.length) editor.deleteShapes(ids)
			return
		}
		default: {
			const unknown = action as { type: string }
			throw new Error(`Unknown action type "${unknown.type}"`)
		}
	}
}

/** What ops get to work with inside one batch. */
export interface BatchContext {
	editor: Editor
	journal: BatchJournal
	memory: RunMemory
	/** Apply one bare action now; returns the short ids it created. Throws on failure. */
	apply(action: CanvasAction): string[]
	/** Every action applied so far in this batch */
	compiled: CanvasAction[]
}

/**
 * Run a batch: one history entry and one batch id, stamped on every shape it creates or changes.
 * The body applies actions through `ctx.apply`.
 */
export function runBatch(
	editor: Editor,
	attribution: Attribution,
	body: (ctx: BatchContext) => void
): { batchId: string; ctx: BatchContext } {
	const batchId = uniqueId()
	const stamp: AgentShapeMeta = { batchId, at: new Date().toISOString() }
	if (attribution.runId) stamp.runId = attribution.runId
	if (attribution.userId) stamp.userId = attribution.userId
	if (attribution.userName) stamp.userName = attribution.userName
	const journal: BatchJournal = { stamp, created: [] }
	const memory = runMemory(editor)
	const ctx: BatchContext = {
		editor,
		journal,
		memory,
		compiled: [],
		apply(action) {
			const created: string[] = []
			applyAction(editor, action, journal, created)
			ctx.compiled.push(action)
			for (const id of created) memory.created.push(toShapeId(id))
			return created
		},
	}
	// One history entry per batch so a user can undo the whole batch at once.
	editor.markHistoryStoppingPoint('canvas ops batch')
	editor.run(() => body(ctx), { history: 'record' })
	return { batchId, ctx }
}
