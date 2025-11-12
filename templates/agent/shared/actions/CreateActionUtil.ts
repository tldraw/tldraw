import { IndexKey, TLShape, TLShapeId, TLShapePartial, toRichText } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import {
	convertSimpleShapeToTldrawShape,
	SIMPLE_TO_GEO_TYPES,
} from '../format/convertSimpleShapeToTldrawShape'
import { SimpleShape, SimpleShapeSchema } from '../format/SimpleShape'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const CreateAction = z
	.object({
		_type: z.literal('create'),
		intent: z.string(),
		shape: SimpleShapeSchema,
	})
	.meta({ title: 'Create', description: 'The AI creates a new shape.' })

type CreateAction = z.infer<typeof CreateAction>

export class CreateActionUtil extends AgentActionUtil<CreateAction> {
	static override type = 'create' as const

	override getSchema() {
		return CreateAction
	}

	override getInfo(action: Streaming<CreateAction>) {
		return {
			icon: 'pencil' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<CreateAction>, helpers: AgentHelpers) {
		if (!action.complete) return action

		const { shape } = action

		// Ensure the created shape has a unique ID
		shape.shapeId = helpers.ensureShapeIdIsUnique(shape.shapeId)

		// If the shape is an arrow, ensure the from and to IDs are real shapes
		if (shape._type === 'arrow') {
			if (shape.fromId) {
				shape.fromId = helpers.ensureShapeIdExists(shape.fromId)
			}
			if (shape.toId) {
				shape.toId = helpers.ensureShapeIdExists(shape.toId)
			}
			if ('x1' in shape) {
				shape.x1 = helpers.ensureValueIsNumber(shape.x1) ?? 0
			}
			if ('y1' in shape) {
				shape.y1 = helpers.ensureValueIsNumber(shape.y1) ?? 0
			}
			if ('x2' in shape) {
				shape.x2 = helpers.ensureValueIsNumber(shape.x2) ?? 0
			}
			if ('y2' in shape) {
				shape.y2 = helpers.ensureValueIsNumber(shape.y2) ?? 0
			}
			if ('bend' in shape) {
				shape.bend = helpers.ensureValueIsNumber(shape.bend) ?? 0
			}
		}

		return action
	}

	override applyAction(action: Streaming<CreateAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return
		const { editor } = this.agent

		// Translate the shape back to the chat's position
		action.shape = helpers.removeOffsetFromShape(action.shape)

		const result = convertSimpleShapeToTldrawShape(editor, action.shape, {
			defaultShape: getDefaultShape(action.shape._type),
		})

		editor.createShape(result.shape)

		// Handle arrow bindings if they exist
		if (result.bindings) {
			for (const binding of result.bindings) {
				editor.createBinding({
					type: binding.type,
					fromId: binding.fromId,
					toId: binding.toId,
					props: binding.props,
					meta: binding.meta,
				})
			}
		}
	}
}

function getDefaultShape(shapeType: SimpleShape['_type']) {
	const isGeo = shapeType in SIMPLE_TO_GEO_TYPES
	return isGeo
		? SHAPE_DEFAULTS.geo
		: (SHAPE_DEFAULTS[shapeType as keyof typeof SHAPE_DEFAULTS] ?? SHAPE_DEFAULTS.unknown)
}

const SHARED_DEFAULTS = {
	isLocked: false,
	opacity: 1,
	rotation: 0,
	meta: {},
	id: 'shape:shape' as TLShapeId,
}

const SHAPE_DEFAULTS: Record<TLShape['type'], TLShapePartial> = {
	text: {
		...SHARED_DEFAULTS,
		type: 'text',
		props: {
			autoSize: true,
			color: 'black',
			font: 'draw',
			richText: toRichText(''),
			scale: 1,
			size: 's',
			textAlign: 'start',
			w: 0,
		},
	},
	line: {
		...SHARED_DEFAULTS,
		type: 'line',
		props: {
			size: 's',
			color: 'black',
			dash: 'draw',
			points: {
				a1: {
					id: 'a1',
					index: 'a1' as IndexKey,
					x: 0,
					y: 0,
				},
				a2: {
					id: 'a2',
					index: 'a2' as IndexKey,
					x: 100,
					y: 0,
				},
			},
			scale: 1,
			spline: 'line',
		},
	},
	arrow: {
		...SHARED_DEFAULTS,
		type: 'arrow',
		props: {
			arrowheadEnd: 'arrow',
			arrowheadStart: 'none',
			bend: 0,
			color: 'black',
			dash: 'draw',
			elbowMidPoint: 0.5,
			end: { x: 100, y: 0 },
			fill: 'none',
			font: 'draw',
			kind: 'arc',
			labelColor: 'black',
			labelPosition: 0.5,
			richText: toRichText(''),
			scale: 1,
			size: 's',
			start: { x: 0, y: 0 },
		},
	},
	geo: {
		...SHARED_DEFAULTS,
		type: 'geo',
		props: {
			align: 'middle',
			color: 'black',
			dash: 'draw',
			fill: 'none',
			font: 'draw',
			geo: 'rectangle',
			growY: 0,
			h: 100,
			labelColor: 'black',
			richText: toRichText(''),
			scale: 1,
			size: 's',
			url: '',
			verticalAlign: 'middle',
			w: 100,
		},
	},
	note: {
		...SHARED_DEFAULTS,
		type: 'note',
		props: {
			color: 'black',
			richText: toRichText(''),
			size: 's',
			align: 'middle',
			font: 'draw',
			fontSizeAdjustment: 0,
			growY: 0,
			labelColor: 'black',
			scale: 1,
			url: '',
			verticalAlign: 'middle',
		},
	},
	draw: {
		...SHARED_DEFAULTS,
		type: 'draw',
		props: {},
	},
	unknown: {
		...SHARED_DEFAULTS,
		type: 'unknown',
		props: {},
	},
}
