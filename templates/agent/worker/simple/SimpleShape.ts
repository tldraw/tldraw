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

function SimpleGeoShape<T extends string>(name: T) {
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

const SimpleRectangleShape = SimpleGeoShape('rectangle')
export type ISimpleRectangleShape = z.infer<typeof SimpleRectangleShape>

const SimpleEllipseShape = SimpleGeoShape('ellipse')
export type ISimpleEllipseShape = z.infer<typeof SimpleEllipseShape>

const SimpleTriangleShape = SimpleGeoShape('triangle')
export type ISimpleTriangleShape = z.infer<typeof SimpleTriangleShape>

const SimpleDiamondShape = SimpleGeoShape('diamond')
export type ISimpleDiamondShape = z.infer<typeof SimpleDiamondShape>

const SimpleHexagonShape = SimpleGeoShape('hexagon')
export type ISimpleHexagonShape = z.infer<typeof SimpleHexagonShape>

const SimpleOvalShape = SimpleGeoShape('oval')
export type ISimpleOvalShape = z.infer<typeof SimpleOvalShape>

const SimpleCloudShape = SimpleGeoShape('cloud')
export type ISimpleCloudShape = z.infer<typeof SimpleCloudShape>

const SimpleXBoxShape = SimpleGeoShape('x-box')
export type ISimpleXBoxShape = z.infer<typeof SimpleXBoxShape>

const SimplePentagonShape = SimpleGeoShape('pentagon')
export type ISimplePentagonShape = z.infer<typeof SimplePentagonShape>

const SimpleOctagonShape = SimpleGeoShape('octagon')
export type ISimpleOctagonShape = z.infer<typeof SimpleOctagonShape>

const SimpleStarShape = SimpleGeoShape('star')
export type ISimpleStarShape = z.infer<typeof SimpleStarShape>

const SimpleRhombusShape = SimpleGeoShape('rhombus')
export type ISimpleRhombusShape = z.infer<typeof SimpleRhombusShape>

const SimpleRhombus2Shape = SimpleGeoShape('rhombus-2')
export type ISimpleRhombus2Shape = z.infer<typeof SimpleRhombus2Shape>

const SimpleTrapezoidShape = SimpleGeoShape('trapezoid')
export type ISimpleTrapezoidShape = z.infer<typeof SimpleTrapezoidShape>

const SimpleArrowRightShape = SimpleGeoShape('arrow-right')
export type ISimpleArrowRightShape = z.infer<typeof SimpleArrowRightShape>

const SimpleArrowLeftShape = SimpleGeoShape('arrow-left')
export type ISimpleArrowLeftShape = z.infer<typeof SimpleArrowLeftShape>

const SimpleArrowUpShape = SimpleGeoShape('arrow-up')
export type ISimpleArrowUpShape = z.infer<typeof SimpleArrowUpShape>

const SimpleArrowDownShape = SimpleGeoShape('arrow-down')
export type ISimpleArrowDownShape = z.infer<typeof SimpleArrowDownShape>

const SimpleCheckBoxShape = SimpleGeoShape('check-box')
export type ISimpleCheckBoxShape = z.infer<typeof SimpleCheckBoxShape>

const SimpleHeartShape = SimpleGeoShape('heart')
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
	text: SimpleLabel,
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
