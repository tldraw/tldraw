import { T } from '@tldraw/validate'
import { TLRichText, richTextValidator, toRichText } from '../misc/TLRichText'
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

/**
 * Style property defining the geometric shape type for geo shapes.
 * Provides a variety of built-in geometric forms including basic shapes,
 * polygons, arrows, and special shapes.
 *
 * @public
 * @example
 * ```ts
 * // Use in shape props
 * const props = {
 *   geo: 'rectangle', // or 'ellipse', 'triangle', etc.
 *   // other properties...
 * }
 * ```
 */
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

/**
 * Type representing valid geometric shape styles for geo shapes.
 *
 * @public
 */
export type TLGeoShapeGeoStyle = T.TypeOf<typeof GeoShapeGeoStyle>

/**
 * Properties for the geo shape, which renders various geometric forms with styling and text.
 *
 * @public
 */
export interface TLGeoShapeProps {
	/** Geometric shape type (rectangle, ellipse, triangle, etc.) */
	geo: TLGeoShapeGeoStyle
	/** Dash pattern style for the shape outline */
	dash: TLDefaultDashStyle
	/** URL link associated with the shape */
	url: string
	/** Width of the shape in pixels */
	w: number
	/** Height of the shape in pixels */
	h: number
	/** Additional vertical growth for text content */
	growY: number
	/** Scale factor applied to the shape */
	scale: number

	/** Color style for text label */
	labelColor: TLDefaultColorStyle
	/** Color style for the shape outline */
	color: TLDefaultColorStyle
	/** Fill style for the shape interior */
	fill: TLDefaultFillStyle
	/** Size/thickness style for outline and text */
	size: TLDefaultSizeStyle
	/** Font style for text content */
	font: TLDefaultFontStyle
	/** Horizontal alignment for text content */
	align: TLDefaultHorizontalAlignStyle
	/** Vertical alignment for text content */
	verticalAlign: TLDefaultVerticalAlignStyle
	/** Rich text content displayed within the shape */
	richText: TLRichText
}

/**
 * A geo shape represents geometric forms like rectangles, ellipses, triangles, and other
 * predefined shapes. Geo shapes support styling, text content, and can act as containers.
 *
 * @public
 * @example
 * ```ts
 * const geoShape: TLGeoShape = {
 *   id: createShapeId(),
 *   typeName: 'shape',
 *   type: 'geo',
 *   x: 100,
 *   y: 100,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:page1',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {
 *     geo: 'rectangle',
 *     w: 200,
 *     h: 100,
 *     color: 'black',
 *     fill: 'solid',
 *     dash: 'solid',
 *     size: 'm',
 *     font: 'draw',
 *     align: 'middle',
 *     verticalAlign: 'middle',
 *     richText: toRichText('Hello World'),
 *     labelColor: 'black',
 *     url: '',
 *     growY: 0,
 *     scale: 1
 *   },
 *   meta: {}
 * }
 * ```
 */
export type TLGeoShape = TLBaseShape<'geo', TLGeoShapeProps>

/**
 * Validation schema for geo shape properties.
 *
 * @public
 * @example
 * ```ts
 * // Validate geo shape properties
 * const isValidGeo = geoShapeProps.geo.isValid('rectangle')
 * const isValidSize = geoShapeProps.w.isValid(100)
 * const isValidText = geoShapeProps.richText.isValid(toRichText('Hello'))
 * ```
 */
export const geoShapeProps: RecordProps<TLGeoShape> = {
	geo: GeoShapeGeoStyle,
	dash: DefaultDashStyle,
	url: T.linkUrl,
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	growY: T.positiveNumber,
	scale: T.nonZeroNumber,

	// Text properties
	labelColor: DefaultLabelColorStyle,
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	richText: richTextValidator,
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
	AddRichText: 10,
})

/**
 * Version identifiers for geo shape migrations.
 *
 * @public
 */
export { geoShapeVersions as geoShapeVersions }

/**
 * Migration sequence for geo shape properties across different schema versions.
 * Handles evolution of geo shapes including URL support, label colors, alignment changes,
 * and the transition from plain text to rich text.
 *
 * @public
 */
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
		{
			id: geoShapeVersions.AddRichText,
			up: (props) => {
				props.richText = toRichText(props.text)
				delete props.text
			},
			// N.B. Explicitly no down state so that we force clients to update.
			// down: (props) => {
			// 	delete props.richText
			// },
		},
	],
})
