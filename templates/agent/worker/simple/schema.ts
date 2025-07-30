import { z } from 'zod'

export const SimpleColor = z.enum([
	'red',
	'light-red',
	'green',
	'light-green',
	'blue',
	'light-blue',
	'orange',
	'yellow',
	'black',
	'violet',
	'light-violet',
	'grey',
	'white',
])

export type ISimpleColor = z.infer<typeof SimpleColor>

const SimpleFill = z.enum(['none', 'tint', 'semi', 'solid', 'pattern'])

export type ISimpleFill = z.infer<typeof SimpleFill>

const SimpleLabel = z.string()

const SimpleRectangleShape = z.object({
	_type: z.literal('rectangle'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleRectangleShape = z.infer<typeof SimpleRectangleShape>

const SimpleEllipseShape = z.object({
	_type: z.literal('ellipse'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleEllipseShape = z.infer<typeof SimpleEllipseShape>

const SimpleTriangleShape = z.object({
	_type: z.literal('triangle'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleTriangleShape = z.infer<typeof SimpleTriangleShape>

const SimpleDiamondShape = z.object({
	_type: z.literal('diamond'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleDiamondShape = z.infer<typeof SimpleDiamondShape>

const SimpleHexagonShape = z.object({
	_type: z.literal('hexagon'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleHexagonShape = z.infer<typeof SimpleHexagonShape>

const SimpleOvalShape = z.object({
	_type: z.literal('oval'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleOvalShape = z.infer<typeof SimpleOvalShape>

const SimpleCloudShape = z.object({
	_type: z.literal('cloud'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleCloudShape = z.infer<typeof SimpleCloudShape>

const SimpleXBoxShape = z.object({
	_type: z.literal('x-box'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleXBoxShape = z.infer<typeof SimpleXBoxShape>

const SimplePentagonShape = z.object({
	_type: z.literal('pentagon'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimplePentagonShape = z.infer<typeof SimplePentagonShape>

const SimpleOctagonShape = z.object({
	_type: z.literal('octagon'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleOctagonShape = z.infer<typeof SimpleOctagonShape>

const SimpleStarShape = z.object({
	_type: z.literal('star'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleStarShape = z.infer<typeof SimpleStarShape>

const SimpleRhombusShape = z.object({
	_type: z.literal('rhombus'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number().optional(),
	height: z.number().optional(),
	color: SimpleColor.optional(),
	fill: SimpleFill.optional(),
	text: SimpleLabel.optional(),
})

export type ISimpleRhombusShape = z.infer<typeof SimpleRhombusShape>

const SimpleRhombus2Shape = z.object({
	_type: z.literal('rhombus-2'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleRhombus2Shape = z.infer<typeof SimpleRhombus2Shape>

const SimpleTrapezoidShape = z.object({
	_type: z.literal('trapezoid'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleTrapezoidShape = z.infer<typeof SimpleTrapezoidShape>

const SimpleArrowRightShape = z.object({
	_type: z.literal('arrow-right'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleArrowRightShape = z.infer<typeof SimpleArrowRightShape>

const SimpleArrowLeftShape = z.object({
	_type: z.literal('arrow-left'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleArrowLeftShape = z.infer<typeof SimpleArrowLeftShape>

const SimpleArrowUpShape = z.object({
	_type: z.literal('arrow-up'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleArrowUpShape = z.infer<typeof SimpleArrowUpShape>

const SimpleArrowDownShape = z.object({
	_type: z.literal('arrow-down'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleArrowDownShape = z.infer<typeof SimpleArrowDownShape>

const SimpleCheckBoxShape = z.object({
	_type: z.literal('check-box'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleCheckBoxShape = z.infer<typeof SimpleCheckBoxShape>

const SimpleHeartShape = z.object({
	_type: z.literal('heart'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor,
	fill: SimpleFill,
	text: SimpleLabel.optional(),
})

export type ISimpleHeartShape = z.infer<typeof SimpleHeartShape>

const SimpleLineShape = z.object({
	_type: z.literal('line'),
	shapeId: z.string(),
	note: z.string(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
	color: SimpleColor,
})

export type ISimpleLineShape = z.infer<typeof SimpleLineShape>

const SimpleNoteShape = z.object({
	_type: z.literal('note'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	color: SimpleColor,
	text: SimpleLabel.optional(),
})

export type ISimpleNoteShape = z.infer<typeof SimpleNoteShape>

const SimpleTextShape = z.object({
	_type: z.literal('text'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	color: SimpleColor,
	text: SimpleLabel.optional(),
	// textAlign: z.enum(['start', 'middle', 'end']).optional(),
})

export type ISimpleTextShape = z.infer<typeof SimpleTextShape>

const SimpleArrowShape = z.object({
	_type: z.literal('arrow'),
	shapeId: z.string(),
	note: z.string(),
	fromId: z.string().nullable(),
	toId: z.string().nullable(),
	x1: z.number(),
	y1: z.number(),
	x2: z.number(),
	y2: z.number(),
	color: SimpleColor,
	text: z.string().optional(),
})

export type ISimpleArrowShape = z.infer<typeof SimpleArrowShape>

const SimpleUnknownShape = z.object({
	_type: z.literal('unknown'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
})

export type ISimpleUnknownShape = z.infer<typeof SimpleUnknownShape>

const SIMPLE_SHAPES = [
	SimpleRectangleShape,
	SimpleEllipseShape,
	SimpleTriangleShape,
	SimpleDiamondShape,
	SimpleHexagonShape,
	SimpleOvalShape,
	SimpleCloudShape,
	SimpleLineShape,
	SimplePentagonShape,
	SimpleOctagonShape,
	SimpleStarShape,
	SimpleRhombusShape,
	SimpleRhombus2Shape,
	SimpleTrapezoidShape,
	SimpleArrowRightShape,
	SimpleArrowLeftShape,
	SimpleArrowUpShape,
	SimpleArrowDownShape,
	SimpleXBoxShape,
	SimpleTextShape,
	SimpleArrowShape,
	SimpleNoteShape,
	SimpleCheckBoxShape,
	SimpleHeartShape,
	SimpleUnknownShape,
] as const

export const SimpleShape = z.union(SIMPLE_SHAPES)

export type ISimpleShape = z.infer<typeof SimpleShape>

export const SimpleShapeUpdate = z.union(SIMPLE_SHAPES)
export type ISimpleShapeUpdate = z.infer<typeof SimpleShapeUpdate>

export interface ISimplePeripheralShape {
	h: number
	w: number
	x: number
	y: number
}

// Events

export const SimpleCreateEvent = z.object({
	_type: z.literal('create'),
	// shapes: z.array(SimpleShape),
	shape: SimpleShape,
	intent: z.string(),
})

export type ISimpleCreateEvent = z.infer<typeof SimpleCreateEvent>

export const SimpleUpdateEvent = z.object({
	_type: z.literal('update'),
	// updates: z.array(SimpleShapeUpdate),
	update: SimpleShapeUpdate,
	intent: z.string(),
})

export type ISimpleUpdateEvent = z.infer<typeof SimpleUpdateEvent>

export const SimpleMoveEvent = z.object({
	_type: z.literal('move'),
	// moves: z.array(
	// 	z.object({
	// 		shapeId: z.string(),
	// 		x: z.number(),
	// 		y: z.number(),
	// 	})
	// ),
	move: z.object({
		shapeId: z.string(),
		x: z.number(),
		y: z.number(),
	}),
	intent: z.string(),
})

export type ISimpleLabelEvent = z.infer<typeof SimpleLabelEvent>

export const SimpleLabelEvent = z.object({
	_type: z.literal('label'),
	// labels: z.array(
	// 	z.object({
	// 		shapeId: z.string(),
	// 		text: z.string(),
	// 	})
	// ),
	label: z.object({
		shapeId: z.string(),
		text: z.string(),
	}),
	intent: z.string(),
})

export type ISimpleMoveEvent = z.infer<typeof SimpleMoveEvent>

const SimpleDeleteEvent = z.object({
	_type: z.literal('delete'),
	// shapeIds: z.array(z.string()),
	shapeId: z.string(),
	intent: z.string(),
})
export type ISimpleDeleteEvent = z.infer<typeof SimpleDeleteEvent>

const SimpleThinkEvent = z.object({
	_type: z.enum(['think', 'message']),
	text: z.string(),
})
export type ISimpleThinkEvent = z.infer<typeof SimpleThinkEvent>

const SimpleScheduleReviewEvent = z.object({
	_type: z.literal('schedule'),
	h: z.number(),
	intent: z.string(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})
export type ISimpleScheduleEvent = z.infer<typeof SimpleScheduleReviewEvent>

const SimpleSetMyViewEvent = z.object({
	_type: z.literal('setMyView'),
	h: z.number(),
	intent: z.string(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})
export type ISimpleSetMyViewEvent = z.infer<typeof SimpleSetMyViewEvent>

export const SimpleEvent = z.union([
	SimpleThinkEvent,
	SimpleCreateEvent,
	SimpleUpdateEvent,
	SimpleDeleteEvent,
	SimpleMoveEvent,
	SimpleLabelEvent,
	SimpleScheduleReviewEvent,
	SimpleSetMyViewEvent,
])

export type ISimpleEvent = z.infer<typeof SimpleEvent>

// Model response schema

export const ModelResponse = z.object({
	events: z.array(SimpleEvent),
})

export type IModelResponse = z.infer<typeof ModelResponse>
