import {
	TLAlignStyle,
	TLColorStyle,
	TLDashStyle,
	TLFillStyle,
	TLFontStyle,
	TLSizeStyle,
	TLStyleType,
} from '..'
import { TLShapeProps } from '../records/TLShape'
import { TLArrowheadEndStyle, TLArrowheadStartStyle } from './TLArrowheadStyle'
import { TLGeoStyle } from './TLGeoStyle'
import { TLSplineStyle } from './TLSplineStyle'
import { TLVerticalAlignStyle } from './TLVerticalAlignStyle'

/** @public */
export type TLStyleItem =
	| TLColorStyle
	| TLFillStyle
	| TLDashStyle
	| TLSizeStyle
	| TLFontStyle
	| TLAlignStyle
	| TLVerticalAlignStyle
	| TLGeoStyle
	| TLArrowheadStartStyle
	| TLArrowheadEndStyle
	| TLSplineStyle
//	| TLIconStyle

/** @public */
export interface TLStyleCollections {
	color: TLColorStyle[]
	fill: TLFillStyle[]
	dash: TLDashStyle[]
	size: TLSizeStyle[]
	font: TLFontStyle[]
	align: TLAlignStyle[]
	verticalAlign: TLVerticalAlignStyle[]
	geo: TLGeoStyle[]
	arrowheadStart: TLArrowheadStartStyle[]
	arrowheadEnd: TLArrowheadEndStyle[]
	spline: TLSplineStyle[]
}

/** @public */
export type TLStyleProps = Pick<TLShapeProps, TLStyleType>
