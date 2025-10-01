import { T } from '@tldraw/validate'
import { TLRichText, richTextValidator, toRichText } from '../misc/TLRichText'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle, TLDefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultTextAlignStyle, TLDefaultTextAlignStyle } from '../styles/TLTextAlignStyle'
import { TLBaseShape } from './TLBaseShape'

/**
 * Configuration interface defining properties for text shapes in tldraw.
 * Text shapes support rich formatting, styling, and automatic sizing.
 *
 * @public
 * @example
 * ```ts
 * const textProps: TLTextShapeProps = {
 *   color: 'black',
 *   size: 'm',
 *   font: 'draw',
 *   textAlign: 'start',
 *   w: 200,
 *   richText: toRichText('Hello **bold** text'),
 *   scale: 1,
 *   autoSize: true
 * }
 * ```
 */
export interface TLTextShapeProps {
	color: TLDefaultColorStyle
	size: TLDefaultSizeStyle
	font: TLDefaultFontStyle
	textAlign: TLDefaultTextAlignStyle
	w: number
	richText: TLRichText
	scale: number
	autoSize: boolean
}

/**
 * A text shape that can display formatted text content with various styling options.
 * Text shapes support rich formatting, automatic sizing, and consistent styling through
 * the tldraw style system.
 *
 * @public
 * @example
 * ```ts
 * const textShape: TLTextShape = {
 *   id: 'shape:text123',
 *   typeName: 'shape',
 *   type: 'text',
 *   x: 100,
 *   y: 200,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:main',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {
 *     color: 'black',
 *     size: 'm',
 *     font: 'draw',
 *     textAlign: 'start',
 *     w: 200,
 *     richText: toRichText('Sample text'),
 *     scale: 1,
 *     autoSize: false
 *   },
 *   meta: {}
 * }
 * ```
 */
export type TLTextShape = TLBaseShape<'text', TLTextShapeProps>

/**
 * Validation schema for text shape properties. This defines the runtime validation
 * rules that ensure text shape data integrity when records are stored or transmitted.
 *
 * @public
 * @example
 * ```ts
 * import { textShapeProps } from '@tldraw/tlschema'
 *
 * // Validate text shape properties
 * const isValid = textShapeProps.richText.isValid(myRichText)
 * if (isValid) {
 *   // Properties are valid, safe to use
 * }
 * ```
 */
export const textShapeProps: RecordProps<TLTextShape> = {
	color: DefaultColorStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	textAlign: DefaultTextAlignStyle,
	w: T.nonZeroNumber,
	richText: richTextValidator,
	scale: T.nonZeroNumber,
	autoSize: T.boolean,
}

const Versions = createShapePropsMigrationIds('text', {
	RemoveJustify: 1,
	AddTextAlign: 2,
	AddRichText: 3,
})

/**
 * Version identifiers for text shape migrations. These constants track
 * the evolution of the text shape schema over time.
 *
 * @public
 * @example
 * ```ts
 * import { textShapeVersions } from '@tldraw/tlschema'
 *
 * // Check if shape data needs migration
 * if (shapeVersion < textShapeVersions.AddRichText) {
 *   // Apply rich text migration
 * }
 * ```
 */
export { Versions as textShapeVersions }

/**
 * Migration sequence for text shape schema evolution. This handles transforming
 * text shape data between different versions as the schema evolves over time.
 *
 * Key migrations include:
 * - RemoveJustify: Replaced 'justify' alignment with 'start'
 * - AddTextAlign: Migrated from 'align' to 'textAlign' property
 * - AddRichText: Converted plain text to rich text format
 *
 * @public
 */
export const textShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.RemoveJustify,
			up: (props) => {
				if (props.align === 'justify') {
					props.align = 'start'
				}
			},
			down: 'retired',
		},
		{
			id: Versions.AddTextAlign,
			up: (props) => {
				props.textAlign = props.align
				delete props.align
			},
			down: (props) => {
				props.align = props.textAlign
				delete props.textAlign
			},
		},
		{
			id: Versions.AddRichText,
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
