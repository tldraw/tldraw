import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { Vec2dModel } from '../geometry-types'
import { TLShapeId } from '../records/TLShape'
import {
	TLArrowheadType,
	TLColorType,
	TLDashType,
	TLFillType,
	TLFontType,
	TLOpacityType,
	TLSizeType,
} from '../style-types'
import { SetValue } from '../util-types'
import {
	arrowheadValidator,
	colorValidator,
	dashValidator,
	fillValidator,
	fontValidator,
	opacityValidator,
	shapeIdValidator,
	sizeValidator,
} from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLArrowShapeProps = {
	labelColor: TLColorType
	color: TLColorType
	fill: TLFillType
	dash: TLDashType
	size: TLSizeType
	opacity: TLOpacityType
	arrowheadStart: TLArrowheadType
	arrowheadEnd: TLArrowheadType
	font: TLFontType
	start: TLArrowTerminal
	end: TLArrowTerminal
	bend: number
	text: string
}

/** @public */
export type TLArrowShape = TLBaseShape<'arrow', TLArrowShapeProps>

/** @public */
export const TL_ARROW_TERMINAL_TYPE = new Set(['binding', 'point'] as const)

/** @public */
export type TLArrowTerminalType = SetValue<typeof TL_ARROW_TERMINAL_TYPE>

/** @public */
export type TLArrowTerminal =
	| {
			type: 'binding'
			boundShapeId: TLShapeId
			normalizedAnchor: Vec2dModel
			isExact: boolean
	  }
	| { type: 'point'; x: number; y: number }

/**
 * A base interface for a shape's arrowheads.
 *
 * @public
 */
export interface TLArrowHeadModel {
	id: string
	type: TLArrowheadType
}

/** @public */
export const arrowTerminalTypeValidator: T.Validator<TLArrowTerminal> = T.union('type', {
	binding: T.object({
		type: T.literal('binding'),
		boundShapeId: shapeIdValidator,
		normalizedAnchor: T.point,
		isExact: T.boolean,
	}),
	point: T.object({
		type: T.literal('point'),
		x: T.number,
		y: T.number,
	}),
})

/** @public */
export const arrowShapeTypeValidator: T.Validator<TLArrowShape> = createShapeValidator(
	'arrow',
	T.object({
		labelColor: colorValidator,
		color: colorValidator,
		fill: fillValidator,
		dash: dashValidator,
		size: sizeValidator,
		opacity: opacityValidator,
		arrowheadStart: arrowheadValidator,
		arrowheadEnd: arrowheadValidator,
		font: fontValidator,
		start: arrowTerminalTypeValidator,
		end: arrowTerminalTypeValidator,
		bend: T.number,
		text: T.string,
	})
)

const Versions = {
	AddLabelColor: 1,
} as const

/** @public */
export const arrowShapeTypeMigrations = defineMigrations({
	currentVersion: Versions.AddLabelColor,
	migrators: {
		[Versions.AddLabelColor]: {
			up: (record) => {
				return {
					...record,
					props: {
						...record.props,
						labelColor: 'black',
					},
				}
			},
			down: (record) => {
				const { labelColor: _, ...props } = record.props
				return {
					...record,
					props,
				}
			},
		},
	},
})
