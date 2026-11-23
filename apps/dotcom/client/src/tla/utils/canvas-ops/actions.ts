import { getHashForString, structuredClone } from '@tldraw/utils'
import {
	areAnglesCompatible,
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
	TAB_ID,
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
	/**
	 * Set when the batch has a key, so a shape it makes without an id gets one derived from the key.
	 * A resend that lands in a second tab while the first tab's copy waits to reconnect then writes
	 * the same records as that copy, instead of a second set of shapes.
	 */
	idSeed?: string
	derivedIds: number
}

/**
 * Shapes one run (one `runId`) created on this editor, in order, across batches; backs `{ created }`
 * refs. Scoped per run so `{ created: 'all' }` never reaches another agent's shapes.
 */
export interface RunMemory {
	created: TLShapeId[]
}
const runMemories = new WeakMap<Editor, Map<string, RunMemory>>()
function runMemory(editor: Editor, runId?: string): RunMemory {
	// A batch that names no run remembers nothing past itself, and isn't kept.
	if (!runId) return { created: [] }
	let byRun = runMemories.get(editor)
	if (!byRun) runMemories.set(editor, (byRun = new Map()))
	let memory = byRun.get(runId)
	if (!memory) byRun.set(runId, (memory = { created: [] }))
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
		// createShape returns quietly at the page's shape limit, which would report a shape that isn't there.
		if (!editor.getShape(id)) throw new Error('The shape could not be created')
		journal.created.push(id)
		createdIds.push(fromShapeId(id))
	}
	const newId = (id: string | undefined) => {
		if (!id) {
			const derived = journal.idSeed && createShapeId(`${journal.idSeed}-${journal.derivedIds++}`)
			return derived && !editor.getShape(derived) ? derived : createShapeId()
		}
		const shapeId = toShapeId(id)
		if (editor.getShape(shapeId))
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
					// From the arrow's id, for the same reason as `idSeed`.
					id: createBindingId(`${fromShapeId(id)}-${terminal}`),
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
			assertUnlocked(editor, shape)
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
			// Lines and strokes have no w/h props: their shape utils scale the points instead. Applied
			// now rather than through `partial`, so x and y in the same action land after it.
			if (
				(shape.type === 'line' || shape.type === 'draw' || shape.type === 'highlight') &&
				(action.w !== undefined || action.h !== undefined)
			) {
				const ratio = (target: number | undefined, actual: number) =>
					target === undefined || actual < 1 ? 1 : Math.max(1, target) / actual
				// Off the page axes, a stretch along them would skew the shape, and resizeShape instead
				// scales it by the smaller ratio and slides it: growing one side moved it at its old size.
				const even = isRotatedOffPageAxes(editor, id)
				if (even && action.w !== undefined && action.h !== undefined) {
					const bounds = editor.getShapePageBounds(id)!
					const [x, y] = [ratio(action.w, bounds.w), ratio(action.h, bounds.h)]
					if (Math.abs(x - y) > 0.02 * Math.max(x, y)) {
						throw new Error(
							`Shape "${action.shapeId}" is rotated, so it can only be scaled evenly: give w or h alone, or both in its current proportions (${Math.round(bounds.w)}x${Math.round(bounds.h)})`
						)
					}
				}
				const scaleTowards = () => {
					const bounds = editor.getShapePageBounds(id)!
					const x = ratio(action.w, bounds.w)
					const y = ratio(action.h, bounds.h)
					const k = action.w !== undefined ? x : y
					editor.resizeShape(
						id,
						even ? { x: k, y: k } : { x, y },
						// The ratios are in page axes, which a rotated shape's own axes are not.
						{ scaleOrigin: { x: bounds.x, y: bounds.y }, scaleAxisRotation: 0 }
					)
				}
				// Stroke width is in the bounds but doesn't scale, so one pass misses; a second closes
				// most of the gap.
				scaleTowards()
				scaleTowards()
			}
			// New shapes are moved into place after creation; stamping that move would mark every new
			// shape as edited.
			if (!journal.created.includes(id)) {
				partial.meta = { ...shape.meta, agentEdit: { ...journal.stamp } }
			}
			editor.updateShape(partial)
			return
		}
		case 'delete_shapes': {
			const shapes = action.shapeIds.map((id) => editor.getShape(toShapeId(id))).filter((s) => !!s)
			for (const shape of shapes) assertUnlocked(editor, shape)
			if (shapes.length) editor.deleteShapes(shapes)
			return
		}
	}
}

/** Whether a shape's page rotation is off the page axes (not a multiple of 90°). */
export function isRotatedOffPageAxes(editor: Editor, id: TLShapeId) {
	return !areAnglesCompatible(editor.getShapePageTransform(id).rotation(), 0)
}

// The editor skips locked shapes without a word, which would report an edit that never happened.
function assertUnlocked(editor: Editor, shape: TLShape) {
	if (editor.isShapeOrAncestorLocked(shape)) {
		throw new Error(`Shape "${fromShapeId(shape.id)}" is locked`)
	}
}

/** What ops get to work with inside one batch. */
export interface BatchContext {
	editor: Editor
	journal: BatchJournal
	memory: RunMemory
	/** The run belongs to another tab, so this tab's selection isn't the one its agent saw. */
	joinedMidRun: boolean
	/** Apply one bare action now; returns the short ids it created. Throws on failure. */
	apply(action: CanvasAction): string[]
}

// Batch keys and run handoffs are kept on the document record rather than on shapes: a batch that
// only deletes leaves no shape to stamp, and a later edit overwrites a shape's stamp. Each is its own
// `meta` entry, because sync patches `meta` one entry deep: a shared map would be sent whole, and two
// tabs writing at once would erase each other's entries. Entries are per user, since agents pick
// their own keys and run ids, and JSON-named, so a ':' in either part can't make two collide. They
// drop off after a day: a resend comes moments after the first attempt, and the margin absorbs tabs
// on other devices pruning with their own clocks.
const BATCH_KEY_PREFIX = 'agentBatchKey:'
const RUN_TAB_PREFIX = 'agentRunTab:'
const AGENT_META_TTL_MS = 24 * 60 * 60 * 1000

function batchKeyEntry({ batchKey, userId = '' }: Attribution) {
	return batchKey ? BATCH_KEY_PREFIX + JSON.stringify([userId, batchKey]) : null
}

function runTabEntry({ runId, userId = '' }: Attribution) {
	return runId ? RUN_TAB_PREFIX + JSON.stringify([userId, runId]) : null
}

/** Whether a batch with this sender's batch key has already been applied to the board. */
export function hasAppliedBatch(editor: Editor, attribution: Attribution) {
	const entry = batchKeyEntry(attribution)
	return !!entry && Object.hasOwn(editor.getDocumentSettings().meta, entry)
}

/**
 * Whether the run belongs to another of the user's tabs: its agent last worked in that tab's
 * selection, not this one's. A run is claimed by the first tab it edits in and moves only when its
 * agent reads a tab's selection, so a batch that names shapes by id doesn't move it. TAB_ID survives
 * a reload, so reloading doesn't make a tab a stranger to its own run.
 */
export function isRunInAnotherTab(editor: Editor, attribution: Attribution) {
	const entry = runTabEntry(attribution)
	if (!entry) return false
	const claim = editor.getDocumentSettings().meta[entry] as { tab?: unknown } | undefined
	return !!claim && claim.tab !== TAB_ID
}

/** The run's agent has read this tab's selection (`get_user_state`), so the run can use it. */
export function markSelectionSeen(editor: Editor, attribution: Attribution) {
	writeAgentMeta(editor, { run: attribution })
}

function writeAgentMeta(editor: Editor, { key, run }: { key?: Attribution; run?: Attribution }) {
	const keyEntry = key && batchKeyEntry(key)
	const runEntry = run && runTabEntry(run)
	if (!keyEntry && !runEntry) return
	const now = Date.now()
	const meta = { ...editor.getDocumentSettings().meta }
	for (const [name, value] of Object.entries(meta)) {
		if (!name.startsWith(BATCH_KEY_PREFIX) && !name.startsWith(RUN_TAB_PREFIX)) continue
		const at = typeof value === 'number' ? value : (value as { at?: unknown } | null)?.at
		if (!(typeof at === 'number' && now - at < AGENT_META_TTL_MS)) delete meta[name]
	}
	if (keyEntry) meta[keyEntry] = now
	if (runEntry) meta[runEntry] = { tab: TAB_ID, at: now }
	// Out of history, so undoing the batch doesn't make its key look unused to a resend.
	editor.updateDocumentSettings({ meta })
}

/**
 * Run a batch: one history entry and one batch id, stamped on every shape it creates or changes.
 * The body applies actions through `ctx.apply`. Returns the batch id.
 */
// Two hashes of the pair, since one 32-bit hash would let two batches' ids collide on a busy board.
function agentIdSeed(userId: string, batchKey: string) {
	const pair = JSON.stringify([userId, batchKey])
	return `b${getHashForString(pair)}${getHashForString(pair + '#')}`.replace(/-/g, '')
}

export function runBatch(
	editor: Editor,
	attribution: Attribution,
	body: (ctx: BatchContext) => void
): string {
	const batchId = uniqueId()
	const stamp: AgentShapeMeta = { batchId, at: new Date().toISOString() }
	if (attribution.runId) stamp.runId = attribution.runId
	if (attribution.userId) stamp.userId = attribution.userId
	const { batchKey, userId = '' } = attribution
	const journal: BatchJournal = {
		stamp,
		created: [],
		idSeed: batchKey && agentIdSeed(userId, batchKey),
		derivedIds: 0,
	}
	const memory = runMemory(editor, attribution.runId)
	// Read before this batch claims the run for this tab.
	const joinedMidRun = isRunInAnotherTab(editor, attribution)
	const claimsRun =
		!!attribution.runId &&
		!Object.hasOwn(editor.getDocumentSettings().meta, runTabEntry(attribution)!)
	const ctx: BatchContext = {
		editor,
		journal,
		memory,
		joinedMidRun,
		apply(action) {
			const created: string[] = []
			applyAction(editor, action, journal, created)
			for (const id of created) memory.created.push(toShapeId(id))
			return created
		},
	}
	// Ops mark their own stopping points so each can be rolled back; squashing leaves one undo step.
	const mark = editor.markHistoryStoppingPoint('canvas ops batch')
	// The key goes in the same transaction as the batch, so the server commits both or neither.
	editor.run(
		() => {
			writeAgentMeta(editor, {
				key: attribution,
				run: claimsRun ? attribution : undefined,
			})
			body(ctx)
		},
		{ history: 'record' }
	)
	editor.squashToMark(mark)
	return batchId
}
