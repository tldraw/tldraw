import {
	SetValue,
	TLBaseShape,
	TLBaseStyle,
	TLColorType,
	TLDashType,
	TLFillType,
	TLFontType,
	TLShapeId,
	TLSizeType,
	Vec2dModel,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

/** @public */
export const TL_ARROWHEAD_TYPES = new Set([
	'arrow',
	'triangle',
	'square',
	'dot',
	'pipe',
	'diamond',
	'inverted',
	'bar',
	'none',
] as const)

/** @public */
export type TLArrowheadType = SetValue<typeof TL_ARROWHEAD_TYPES>

/** @public */
export interface TLArrowheadStartStyle extends TLBaseStyle {
	id: TLArrowheadType
	type: 'arrowheadStart'
}

/** @public */
export interface TLArrowheadEndStyle extends TLBaseStyle {
	id: TLArrowheadType
	type: 'arrowheadEnd'
}

/** @internal */
export const arrowheadValidator = T.setEnum(TL_ARROWHEAD_TYPES)

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
