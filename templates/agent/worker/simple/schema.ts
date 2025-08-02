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

function GeoShape<T extends string>(name: T) {
	return z.object({
		_type: z.literal(name),
		color: SimpleColor,
		fill: SimpleFill,
		height: z.number(),
		note: z.string(),
		shapeId: z.string(),
		text: SimpleLabel.optional(),
		width: z.number(),
		x: z.number(),
		y: z.number(),
	})
}

const SimpleRectangleShape = GeoShape('rectangle')
export type ISimpleRectangleShape = z.infer<typeof SimpleRectangleShape>

const SimpleEllipseShape = GeoShape('ellipse')
export type ISimpleEllipseShape = z.infer<typeof SimpleEllipseShape>

const SimpleTriangleShape = GeoShape('triangle')
export type ISimpleTriangleShape = z.infer<typeof SimpleTriangleShape>

const SimpleDiamondShape = GeoShape('diamond')
export type ISimpleDiamondShape = z.infer<typeof SimpleDiamondShape>

const SimpleHexagonShape = GeoShape('hexagon')
export type ISimpleHexagonShape = z.infer<typeof SimpleHexagonShape>

const SimpleOvalShape = GeoShape('oval')
export type ISimpleOvalShape = z.infer<typeof SimpleOvalShape>

const SimpleCloudShape = GeoShape('cloud')
export type ISimpleCloudShape = z.infer<typeof SimpleCloudShape>

const SimpleXBoxShape = GeoShape('x-box')
export type ISimpleXBoxShape = z.infer<typeof SimpleXBoxShape>

const SimplePentagonShape = GeoShape('pentagon')
export type ISimplePentagonShape = z.infer<typeof SimplePentagonShape>

const SimpleOctagonShape = GeoShape('octagon')
export type ISimpleOctagonShape = z.infer<typeof SimpleOctagonShape>

const SimpleStarShape = GeoShape('star')
export type ISimpleStarShape = z.infer<typeof SimpleStarShape>

const SimpleRhombusShape = GeoShape('rhombus')
export type ISimpleRhombusShape = z.infer<typeof SimpleRhombusShape>

const SimpleRhombus2Shape = GeoShape('rhombus-2')
export type ISimpleRhombus2Shape = z.infer<typeof SimpleRhombus2Shape>

const SimpleTrapezoidShape = GeoShape('trapezoid')
export type ISimpleTrapezoidShape = z.infer<typeof SimpleTrapezoidShape>

const SimpleArrowRightShape = GeoShape('arrow-right')
export type ISimpleArrowRightShape = z.infer<typeof SimpleArrowRightShape>

const SimpleArrowLeftShape = GeoShape('arrow-left')
export type ISimpleArrowLeftShape = z.infer<typeof SimpleArrowLeftShape>

const SimpleArrowUpShape = GeoShape('arrow-up')
export type ISimpleArrowUpShape = z.infer<typeof SimpleArrowUpShape>

const SimpleArrowDownShape = GeoShape('arrow-down')
export type ISimpleArrowDownShape = z.infer<typeof SimpleArrowDownShape>

const SimpleCheckBoxShape = GeoShape('check-box')
export type ISimpleCheckBoxShape = z.infer<typeof SimpleCheckBoxShape>

const SimpleHeartShape = GeoShape('heart')
export type ISimpleHeartShape = z.infer<typeof SimpleHeartShape>

const SimpleLineShape = z.object({
	_type: z.literal('line'),
	color: SimpleColor,
	note: z.string(),
	shapeId: z.string(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
})

export type ISimpleLineShape = z.infer<typeof SimpleLineShape>

const SimpleNoteShape = z.object({
	_type: z.literal('note'),
	color: SimpleColor,
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel.optional(),
	x: z.number(),
	y: z.number(),
})

export type ISimpleNoteShape = z.infer<typeof SimpleNoteShape>

const SimpleTextShape = z.object({
	_type: z.literal('text'),
	color: SimpleColor,
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel.optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	x: z.number(),
	y: z.number(),
})

export type ISimpleTextShape = z.infer<typeof SimpleTextShape>

const SimpleArrowShape = z.object({
	_type: z.literal('arrow'),
	color: SimpleColor,
	fromId: z.string().nullable(),
	note: z.string(),
	shapeId: z.string(),
	text: z.string().optional(),
	toId: z.string().nullable(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
	bend: z.number().optional(),
})

export type ISimpleArrowShape = z.infer<typeof SimpleArrowShape>

const SimpleUnknownShape = z.object({
	_type: z.literal('unknown'),
	note: z.string(),
	shapeId: z.string(),
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

export interface ISimplePeripheralShape {
	h?: number
	w?: number
	x: number
	y: number
}

// Events

export const SimpleCreateEvent = z.object({
	_type: z.literal('create'),
	intent: z.string(),
	shape: SimpleShape,
})

export type ISimpleCreateEvent = z.infer<typeof SimpleCreateEvent>

export const SimpleUpdateEvent = z.object({
	_type: z.literal('update'),
	intent: z.string(),
	update: SimpleShape,
})

export type ISimpleUpdateEvent = z.infer<typeof SimpleUpdateEvent>

export const SimpleMoveEvent = z.object({
	_type: z.literal('move'),
	intent: z.string(),
	move: z.object({
		shapeId: z.string(),
		x: z.number(),
		y: z.number(),
	}),
})

export type ISimpleLabelEvent = z.infer<typeof SimpleLabelEvent>

export const SimpleLabelEvent = z.object({
	_type: z.literal('label'),
	intent: z.string(),
	label: z.object({
		shapeId: z.string(),
		text: z.string(),
	}),
})

export type ISimpleMoveEvent = z.infer<typeof SimpleMoveEvent>

const SimpleDeleteEvent = z.object({
	_type: z.literal('delete'),
	intent: z.string(),
	shapeId: z.string(),
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
export type ISimpleScheduleReviewEvent = z.infer<typeof SimpleScheduleReviewEvent>

const SimpleScheduleSetMyViewEvent = z.object({
	_type: z.literal('setMyView'),
	h: z.number(),
	intent: z.string(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})
export type ISimpleScheduleSetMyViewEvent = z.infer<typeof SimpleScheduleSetMyViewEvent>

export const SimpleEvent = z.union([
	SimpleThinkEvent,
	SimpleCreateEvent,
	SimpleUpdateEvent,
	SimpleDeleteEvent,
	SimpleMoveEvent,
	SimpleLabelEvent,
	SimpleScheduleReviewEvent,
	SimpleScheduleSetMyViewEvent,
])

export type ISimpleEvent = z.infer<typeof SimpleEvent>

// Model response schema

export const ModelResponse = z.object({
	events: z.array(SimpleEvent),
})

export type IModelResponse = z.infer<typeof ModelResponse>
