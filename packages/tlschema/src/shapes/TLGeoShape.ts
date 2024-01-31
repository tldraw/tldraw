import { T } from '@tldraw/validate'
import { StyleProp } from '../styles/StyleProp'
import { DefaultColorStyle, DefaultLabelColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultHorizontalAlignStyle } from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultVerticalAlignStyle } from '../styles/TLVerticalAlignStyle'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const GeoShapeGeoStyle = StyleProp.defineEnum('tldraw:geo', {
	defaultValue: 'rectangle',
	values: [
		'cloud',
		'rectangle',
		'ellipse',
		'triangle',
		'diamond',
		'pentagon',
		'hexagon',
		'octagon',
		'star',
		'rhombus',
		'rhombus-2',
		'oval',
		'trapezoid',
		'arrow-right',
		'arrow-left',
		'arrow-up',
		'arrow-down',
		'x-box',
		'check-box',
	],
})

/** @public */
export type TLGeoShapeGeoStyle = T.TypeOf<typeof GeoShapeGeoStyle>

/** @public */
export const geoShapeProps = {
	geo: GeoShapeGeoStyle,
	labelColor: DefaultLabelColorStyle,
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	url: T.linkUrl,
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	growY: T.positiveNumber,
	text: T.string,
}

/** @public */
export type TLGeoShapeProps = ShapePropsType<typeof geoShapeProps>

/** @public */
export type TLGeoShape = TLBaseShape<'geo', TLGeoShapeProps>
