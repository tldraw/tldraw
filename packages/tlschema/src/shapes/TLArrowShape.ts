import { defineMigrations } from '@tldraw/store'

import {
	TypeValidator,
	booleanValidator,
	literalValidator,
	numberValidator,
	objectValidator,
	pointValidator,
	stringValidator,
	unionValidator,
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
export const arrowTerminalValidator: TypeValidator<TLArrowTerminal> = unionValidator('type', {
	binding: objectValidator({
		type: literalValidator('binding'),
		boundShapeId: shapeIdValidator,
		normalizedAnchor: pointValidator,
		isExact: booleanValidator,
	}),
	point: objectValidator({
		type: literalValidator('point'),
		x: numberValidator,
		y: numberValidator,
	}),
})

/** @internal */
export const arrowShapeValidator: TypeValidator<TLArrowShape> = createShapeValidator(
	'arrow',
	objectValidator({
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
		bend: numberValidator,
		text: stringValidator,
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
