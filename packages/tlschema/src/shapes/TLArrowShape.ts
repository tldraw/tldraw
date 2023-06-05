import { defineMigrations } from '@tldraw/store'

import {
	TypeValidator,
	boolean,
	literal,
	number,
	object,
	point,
	string,
	union,
} from '@tldraw/validate'
import { Vec2dModel } from '../misc/geometry-types'
import { TLShapeId } from '../records/TLShape'
import { TLArrowheadType, arrowheadValidator } from '../styles/TLArrowheadStyle'
import { TLColorType, colorValidator } from '../styles/TLColorStyle'
import { TLDashType, dashValidator } from '../styles/TLDashStyle'
import { TLFillType, fillValidator } from '../styles/TLFillStyle'
import { TLFontType, fontValidator } from '../styles/TLFontStyle'
import { TLOpacityType, opacityValidator } from '../styles/TLOpacityStyle'
import { TLSizeType, sizeValidator } from '../styles/TLSizeStyle'
import { SetValue } from '../util-types'
import { TLBaseShape, createShapeValidator, shapeIdValidator } from './TLBaseShape'

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

/** @internal */
export const arrowTerminalValidator: TypeValidator<TLArrowTerminal> = union('type', {
	binding: object({
		type: literal('binding'),
		boundShapeId: shapeIdValidator,
		normalizedAnchor: point,
		isExact: boolean,
	}),
	point: object({
		type: literal('point'),
		x: number,
		y: number,
	}),
})

/** @internal */
export const arrowShapeValidator: TypeValidator<TLArrowShape> = createShapeValidator(
	'arrow',
	object({
		labelColor: colorValidator,
		color: colorValidator,
		fill: fillValidator,
		dash: dashValidator,
		size: sizeValidator,
		opacity: opacityValidator,
		arrowheadStart: arrowheadValidator,
		arrowheadEnd: arrowheadValidator,
		font: fontValidator,
		start: arrowTerminalValidator,
		end: arrowTerminalValidator,
		bend: number,
		text: string,
	})
)

const Versions = {
	AddLabelColor: 1,
} as const

/** @internal */
export const arrowShapeMigrations = defineMigrations({
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
