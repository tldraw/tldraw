import { T } from '@tldraw/validate'
import { RETIRED_DOWN_MIGRATION, createShapePropsMigrations } from '../records/TLShape'
import { StyleProp } from '../styles/StyleProp'
import { DefaultColorStyle, DefaultLabelColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import {
	DefaultHorizontalAlignStyle,
	TLDefaultHorizontalAlignStyle,
} from '../styles/TLHorizontalAlignStyle'
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

const geoShapeVersions = {
	AddUrlProp: 1,
	AddLabelColor: 2,
	RemoveJustify: 3,
	AddCheckBox: 4,
	AddVerticalAlign: 5,
	MigrateLegacyAlign: 6,
	AddCloud: 7,
	MakeUrlsValid: 8,
} as const

export { geoShapeVersions as geoShapeVersions }

/** @internal */
export const geoShapeMigrations = createShapePropsMigrations({
	sequence: [
		{
			version: geoShapeVersions.AddUrlProp,
			up: (props) => {
				props.url = ''
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			version: geoShapeVersions.AddLabelColor,
			up: (props) => {
				props.labelColor = 'black'
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			version: geoShapeVersions.RemoveJustify,
			up: (props) => {
				if (props.align === 'justify') {
					props.align = 'start'
				}
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			version: geoShapeVersions.AddCheckBox,
			up: (_props) => {
				// noop
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			version: geoShapeVersions.AddVerticalAlign,
			up: (props) => {
				props.verticalAlign = 'middle'
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			version: geoShapeVersions.MigrateLegacyAlign,
			up: (props) => {
				let newAlign: TLDefaultHorizontalAlignStyle
				switch (props.align) {
					case 'start':
						newAlign = 'start-legacy'
						break
					case 'end':
						newAlign = 'end-legacy'
						break
					default:
						newAlign = 'middle-legacy'
						break
				}
				props.align = newAlign
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			version: geoShapeVersions.AddCloud,
			up: (_props) => {
				// noop
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			version: geoShapeVersions.MakeUrlsValid,
			up: (props) => {
				if (!T.linkUrl.isValid(props.url)) {
					props.url = ''
				}
			},
			down: (_props) => {
				// noop
			},
		},
	],
})
