import {
	SetValue,
	TLArrowheadType,
	TLBaseShape,
	TLColorType,
	TLDashType,
	TLFillType,
	TLFontType,
	TLShapeId,
	TLSizeType,
	Vec2dModel,
} from '@tldraw/tlschema'

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
