import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RETIRED_DOWN_MIGRATION, RecordPropsType } from '../recordsWithProps'
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
import { TLBaseShape } from './TLBaseShape'

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
export type TLGeoShapeProps = RecordPropsType<typeof geoShapeProps>

/** @public */
export type TLGeoShape = TLBaseShape<'geo', TLGeoShapeProps>

const geoShapeVersions = createShapePropsMigrationIds('geo', {
	AddUrlProp: 1,
	AddLabelColor: 2,
	RemoveJustify: 3,
	AddCheckBox: 4,
	AddVerticalAlign: 5,
	MigrateLegacyAlign: 6,
	AddCloud: 7,
	MakeUrlsValid: 8,
})

export { geoShapeVersions as geoShapeVersions }

/** @public */
export const geoShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: geoShapeVersions.AddUrlProp,
			up: (props) => {
				props.url = ''
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: geoShapeVersions.AddLabelColor,
			up: (props) => {
				props.labelColor = 'black'
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: geoShapeVersions.RemoveJustify,
			up: (props) => {
				if (props.align === 'justify') {
					props.align = 'start'
				}
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: geoShapeVersions.AddCheckBox,
			up: (_props) => {
				// noop
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: geoShapeVersions.AddVerticalAlign,
			up: (props) => {
				props.verticalAlign = 'middle'
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: geoShapeVersions.MigrateLegacyAlign,
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
			id: geoShapeVersions.AddCloud,
			up: (_props) => {
				// noop
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: geoShapeVersions.MakeUrlsValid,
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
