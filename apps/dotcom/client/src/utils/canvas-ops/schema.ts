import { z } from 'zod'

// The canvas op vocabulary. Ops are what a collaborator would say ("put a label above the heart",
// "connect these"); they compile to bare actions (CanvasAction), the only thing that touches the
// editor.

export const CanvasColorSchema = z.enum([
	'black',
	'grey',
	'light-violet',
	'violet',
	'blue',
	'light-blue',
	'yellow',
	'orange',
	'green',
	'light-green',
	'light-red',
	'red',
	'white',
])
export type CanvasColor = z.infer<typeof CanvasColorSchema>

export const CanvasFillSchema = z.enum(['none', 'semi', 'solid', 'pattern', 'fill'])
export type CanvasFill = z.infer<typeof CanvasFillSchema>
export const CanvasDashSchema = z.enum(['draw', 'solid', 'dashed', 'dotted'])
export type CanvasDash = z.infer<typeof CanvasDashSchema>
export const CanvasSizeSchema = z.enum(['s', 'm', 'l', 'xl'])
export type CanvasSize = z.infer<typeof CanvasSizeSchema>

export const CanvasGeoSchema = z.enum([
	'rectangle',
	'ellipse',
	'triangle',
	'diamond',
	'hexagon',
	'star',
	'cloud',
	'heart',
	'arrow-right',
	'arrow-left',
	'arrow-up',
	'arrow-down',
	'x-box',
	'check-box',
])
export type CanvasGeo = z.infer<typeof CanvasGeoSchema>

const finite = z.number()
const shapeIdString = z.string().min(1).max(200)
const text = z.string().max(5000)
const optionalId = shapeIdString.regex(/^[A-Za-z0-9:_-]+$/).optional()
const PointSchema = z.object({ x: finite, y: finite })

const PathFields = {
	id: optionalId,
	points: z
		.array(
			z.object({
				x: finite.min(-1_000_000).max(1_000_000),
				y: finite.min(-1_000_000).max(1_000_000),
			})
		)
		.min(2)
		.max(256),
	closed: z.boolean().optional(),
	smooth: z.boolean().optional(),
	color: CanvasColorSchema.optional(),
	fill: CanvasFillSchema.optional(),
	dash: CanvasDashSchema.optional(),
	size: CanvasSizeSchema.optional(),
}

/** How ops name shapes without coordinates. An ambiguous or empty match is an op error. */
export const RefSchema = z.union([
	shapeIdString,
	z.object({ text: z.string().min(1).max(200) }),
	z.object({ selected: z.literal(true) }),
	z.object({ created: z.union([z.literal('last'), z.number().int().min(0)]) }),
	z.object({ description: z.string().min(1).max(200) }),
])
export type Ref = z.infer<typeof RefSchema>

export const RefListSchema = z.union([
	z.array(RefSchema).min(1).max(200),
	z.object({ selected: z.literal(true) }),
	z.object({ created: z.literal('all') }),
	z.object({ text: z.string().min(1).max(200) }),
])
export type RefList = z.infer<typeof RefListSchema>

const NewSubjectKind = z.enum(['label', 'note', 'box', 'ellipse', 'shape'])

/** A shape an op creates, described by kind rather than geometry. */
export interface NewSubject {
	kind?: z.infer<typeof NewSubjectKind>
	text?: string
	geo?: CanvasGeo
	w?: number
	h?: number
	color?: CanvasColor
	fill?: CanvasFill
	dash?: CanvasDash
	size?: CanvasSize
	id?: string
}

const Relation = z.enum(['above', 'below', 'left_of', 'right_of', 'inside', 'centered_on'])
const Align = z.enum(['start', 'center', 'end'])
const TargetOrPoint = z.union([RefSchema, z.strictObject({ point: PointSchema })])

export const CanvasOpSchema = z.discriminatedUnion('op', [
	z.strictObject({ op: z.literal('path'), ...PathFields }),
	z.strictObject({
		op: z.literal('duplicate'),
		subject: RefSchema,
		id: optionalId,
		at: PointSchema,
		text: text.optional(),
	}),
	z.strictObject({
		op: z.literal('add'),
		kind: NewSubjectKind.optional(),
		text: text.optional(),
		id: optionalId,
		geo: CanvasGeoSchema.optional(),
		w: finite.positive().optional(),
		h: finite.positive().optional(),
		color: CanvasColorSchema.optional(),
		fill: CanvasFillSchema.optional(),
		dash: CanvasDashSchema.optional(),
		size: CanvasSizeSchema.optional(),
		relation: Relation.optional(),
		target: RefSchema.optional(),
		at: PointSchema.optional(),
		gap: finite.min(0).optional(),
		align: Align.optional(),
	}),
	z.strictObject({
		op: z.literal('place'),
		subject: RefSchema,
		relation: Relation.optional(),
		target: RefSchema.optional(),
		at: PointSchema.optional(),
		gap: finite.min(0).optional(),
		align: Align.optional(),
		w: finite.positive().optional(),
		h: finite.positive().optional(),
		text: text.optional(),
		color: CanvasColorSchema.optional(),
		fill: CanvasFillSchema.optional(),
		dash: CanvasDashSchema.optional(),
		size: CanvasSizeSchema.optional(),
	}),
	z.strictObject({
		op: z.literal('label'),
		target: TargetOrPoint,
		text,
		side: z.enum(['above', 'below', 'left', 'right', 'auto']).optional(),
		arrow: z.boolean().optional(),
		gap: finite.min(0).optional(),
		color: CanvasColorSchema.optional(),
		size: CanvasSizeSchema.optional(),
		id: optionalId,
	}),
	z.strictObject({
		op: z.literal('connect'),
		from: TargetOrPoint,
		to: TargetOrPoint,
		text: text.optional(),
		color: CanvasColorSchema.optional(),
		dash: CanvasDashSchema.optional(),
		id: optionalId,
	}),
	z.strictObject({
		op: z.literal('rename'),
		target: RefSchema,
		text,
		fit: z.enum(['widen', 'shrink_text']).optional(),
	}),
	z.strictObject({
		op: z.literal('restyle'),
		targets: RefListSchema,
		color: CanvasColorSchema.optional(),
		fill: CanvasFillSchema.optional(),
		dash: CanvasDashSchema.optional(),
		size: CanvasSizeSchema.optional(),
		like: RefSchema.optional(),
	}),
	z.strictObject({
		op: z.literal('remove'),
		targets: RefListSchema,
	}),
	z.strictObject({
		op: z.literal('untangle'),
		targets: RefListSchema,
		keepNear: z.array(RefSchema).optional(),
		maxDistance: finite.positive().optional(),
	}),
	z.strictObject({
		op: z.literal('resize'),
		target: RefSchema,
		w: finite.positive().optional(),
		h: finite.positive().optional(),
		scale: finite.positive().optional(),
		anchor: z.enum(['top-left', 'center']).optional(),
	}),
])
export type CanvasOp = z.infer<typeof CanvasOpSchema>

export const OpsBatchSchema = z
	.object({
		ops: z.array(CanvasOpSchema),
	})
	.strict()
export type OpsBatch = z.infer<typeof OpsBatchSchema>

/** Who asked for a batch; stamped on every shape the batch creates or changes. */
export const AttributionSchema = z.object({
	runId: z.string().max(200).optional(),
	userId: z.string().max(200).optional(),
	userName: z.string().max(200).optional(),
})
export type Attribution = z.infer<typeof AttributionSchema>

/** What a batch stamps on `shape.meta.agent` (created) and `shape.meta.agentEdit` (changed). */
export interface AgentShapeMeta {
	batchId: string
	runId?: string
	userId?: string
	userName?: string
	/** ISO timestamp of the batch */
	at: string
}

/** What one op did, so the sender learns where things landed. */
export interface OpResult {
	index: number
	op: CanvasOp['op']
	ok: boolean
	shapeIds: string[]
	message: string
	/** What the op did beyond the literal request (a nudge, a shrink, an inherited style), if anything */
	adjusted?: string
}

export interface ApplyOpsResult {
	batchId: string
	applied: number
	createdIds: string[]
	errors: string[]
	results: OpResult[]
	/** Concrete actions the ops compiled to */
	compiled: CanvasAction[]
}

/** An arrow endpoint: a point in page space, or a shape to bind to. */
export type ArrowTerminal = { x: number; y: number } | { shapeId: string }

interface StyleFields {
	color?: CanvasColor
	fill?: CanvasFill
	dash?: CanvasDash
	size?: CanvasSize
}

/**
 * What ops compile to; the only thing that touches the editor. Internal: senders send ops, so
 * actions are never validated input.
 */
export type CanvasAction =
	| ({
			type: 'create_path'
			id?: string
			points: Array<{ x: number; y: number }>
			closed?: boolean
			smooth?: boolean
	  } & StyleFields)
	| { type: 'duplicate_shape'; shapeId: string; id?: string; x: number; y: number; text?: string }
	| {
			type: 'create_text'
			id?: string
			text: string
			x: number
			y: number
			color?: CanvasColor
			size?: CanvasSize
	  }
	| ({
			type: 'create_shape'
			id?: string
			geo: CanvasGeo
			x: number
			y: number
			w: number
			h: number
			text?: string
			align?: 'start' | 'end'
	  } & StyleFields)
	| { type: 'create_note'; id?: string; text: string; x: number; y: number; color?: CanvasColor }
	| {
			type: 'create_arrow'
			id?: string
			from: ArrowTerminal
			to: ArrowTerminal
			text?: string
			color?: CanvasColor
			dash?: CanvasDash
	  }
	| ({
			type: 'update_shape'
			shapeId: string
			x?: number
			y?: number
			w?: number
			h?: number
			text?: string
	  } & StyleFields)
	| { type: 'delete_shapes'; shapeIds: string[] }
