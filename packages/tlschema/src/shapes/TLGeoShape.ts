import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { StyleProp } from '../styles/StyleProp'
import {
	DefaultColorStyle,
	DefaultLabelColorStyle,
	TLDefaultColorStyle,
} from '../styles/TLColorStyle'
import { DefaultDashStyle, TLDefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle, TLDefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle, TLDefaultFontStyle } from '../styles/TLFontStyle'
import {
	DefaultHorizontalAlignStyle,
	TLDefaultHorizontalAlignStyle,
} from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import {
	DefaultVerticalAlignStyle,
	TLDefaultVerticalAlignStyle,
} from '../styles/TLVerticalAlignStyle'
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
		'heart',
	],
})

/** @public */
export type TLGeoShapeGeoStyle = T.TypeOf<typeof GeoShapeGeoStyle>

/** @public */
export interface TLGeoShapeProps {
	geo: TLGeoShapeGeoStyle
	labelColor: TLDefaultColorStyle
	color: TLDefaultColorStyle
	fill: TLDefaultFillStyle
	dash: TLDefaultDashStyle
	size: TLDefaultSizeStyle
	font: TLDefaultFontStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	url: string
	w: number
	h: number
	growY: number
	text: string
	scale: number
}

/** @public */
export type TLGeoShape = TLBaseShape<'geo', TLGeoShapeProps>

/** @public */
export const geoShapeProps: RecordProps<TLGeoShape> = {
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
	scale: T.nonZeroNumber,
}

const geoShapeVersions = createShapePropsMigrationIds('geo', {
	AddUrlProp: 1,
	AddLabelColor: 2,
	RemoveJustify: 3,
	AddCheckBox: 4,
	AddVerticalAlign: 5,
	MigrateLegacyAlign: 6,
	AddCloud: 7,
	MakeUrlsValid: 8,
	AddScale: 9,
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
			down: 'retired',
		},
		{
			id: geoShapeVersions.AddLabelColor,
			up: (props) => {
				props.labelColor = 'black'
			},
			down: 'retired',
		},
		{
			id: geoShapeVersions.RemoveJustify,
			up: (props) => {
				if (props.align === 'justify') {
					props.align = 'start'
				}
			},
			down: 'retired',
		},
		{
			id: geoShapeVersions.AddCheckBox,
			up: (_props) => {
				// noop
			},
			down: 'retired',
		},
		{
			id: geoShapeVersions.AddVerticalAlign,
			up: (props) => {
				props.verticalAlign = 'middle'
			},
			down: 'retired',
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
			down: 'retired',
		},
		{
			id: geoShapeVersions.AddCloud,
			up: (_props) => {
				// noop
			},
			down: 'retired',
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
		{
			id: geoShapeVersions.AddScale,
			up: (props) => {
				props.scale = 1
			},
			down: (props) => {
				delete props.scale
			},
		},
	],
})
