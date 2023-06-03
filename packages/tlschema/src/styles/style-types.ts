import {
	TLAlignStyle,
	TLColorStyle,
	TLDashStyle,
	TLFillStyle,
	TLFontStyle,
	TLOpacityStyle,
	TLSizeStyle,
	TLStyleType,
} from '..'
import { TLShapeProps } from '../records/TLShape'
import { TLArrowheadEndStyle, TLArrowheadStartStyle } from './arrowhead'
import { TLGeoStyle } from './geo'
import { TLSplineTypeStyle } from './spline'
import { TLVerticalAlignStyle } from './vertical-align'

/** @public */
export type TLStyleItem =
	| TLColorStyle
	| TLFillStyle
	| TLDashStyle
	| TLSizeStyle
	| TLOpacityStyle
	| TLFontStyle
	| TLAlignStyle
	| TLVerticalAlignStyle
	| TLGeoStyle
	| TLArrowheadStartStyle
	| TLArrowheadEndStyle
	| TLSplineTypeStyle
//	| TLIconStyle

/** @public */
export interface TLStyleCollections {
	color: TLColorStyle[]
	fill: TLFillStyle[]
	dash: TLDashStyle[]
	size: TLSizeStyle[]
	opacity: TLOpacityStyle[]
	font: TLFontStyle[]
	align: TLAlignStyle[]
	verticalAlign: TLVerticalAlignStyle[]
	geo: TLGeoStyle[]
	arrowheadStart: TLArrowheadStartStyle[]
	arrowheadEnd: TLArrowheadEndStyle[]
	spline: TLSplineTypeStyle[]
	// icon: TLIconStyle[]
}

/** @public */
export type TLStyleProps = Pick<TLShapeProps, TLStyleType>
