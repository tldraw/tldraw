import { T } from '@tldraw/validate'
import { TLRichText, richTextValidator, toRichText } from '../misc/TLRichText'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import {
	DefaultColorStyle,
	DefaultLabelColorStyle,
	TLDefaultColorStyle,
} from '../styles/TLColorStyle'
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
 * Properties for a note shape. Note shapes represent sticky notes or text annotations
 * with rich formatting capabilities and various styling options.
 *
 * @public
 * @example
 * ```ts
 * const noteProps: TLNoteShapeProps = {
 *   color: 'yellow',
 *   labelColor: 'black',
 *   size: 'm',
 *   font: 'draw',
 *   fontSizeAdjustment: 0,
 *   align: 'middle',
 *   verticalAlign: 'middle',
 *   growY: 0,
 *   url: '',
 *   richText: toRichText('Hello **world**!'),
 *   scale: 1
 * }
 * ```
 */
export interface TLNoteShapeProps {
	/** Background color style of the note */
	color: TLDefaultColorStyle
	/** Text color style for the note content */
	labelColor: TLDefaultColorStyle
	/** Size style determining the font size and note dimensions */
	size: TLDefaultSizeStyle
	/** Font family style for the note text */
	font: TLDefaultFontStyle
	/** Adjustment to the base font size (positive increases, negative decreases) */
	fontSizeAdjustment: number
	/** Horizontal alignment of text within the note */
	align: TLDefaultHorizontalAlignStyle
	/** Vertical alignment of text within the note */
	verticalAlign: TLDefaultVerticalAlignStyle
	/** Additional height growth for the note beyond its base size */
	growY: number
	/** Optional URL associated with the note for linking */
	url: string
	/** Rich text content with formatting like bold, italic, etc. */
	richText: TLRichText
	/** Scale factor applied to the note shape for display */
	scale: number
}

/**
 * A note shape representing a sticky note or text annotation on the canvas.
 * Note shapes support rich text formatting, various styling options, and can
 * be used for annotations, reminders, or general text content.
 *
 * @public
 * @example
 * ```ts
 * const noteShape: TLNoteShape = {
 *   id: 'shape:note1',
 *   type: 'note',
 *   x: 100,
 *   y: 100,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:main',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {
 *     color: 'light-blue',
 *     labelColor: 'black',
 *     size: 's',
 *     font: 'sans',
 *     fontSizeAdjustment: 2,
 *     align: 'start',
 *     verticalAlign: 'start',
 *     growY: 50,
 *     url: 'https://example.com',
 *     richText: toRichText('Important **note**!'),
 *     scale: 1
 *   },
 *   meta: {},
 *   typeName: 'shape'
 * }
 * ```
 */
export type TLNoteShape = TLBaseShape<'note', TLNoteShapeProps>

/**
 * Validation schema for note shape properties. Defines the runtime validation rules
 * for all properties of note shapes, ensuring data integrity and type safety.
 *
 * @public
 * @example
 * ```ts
 * import { noteShapeProps } from '@tldraw/tlschema'
 *
 * // Used internally by the validation system
 * const validator = T.object(noteShapeProps)
 * const validatedProps = validator.validate(someNoteProps)
 * ```
 */
export const noteShapeProps: RecordProps<TLNoteShape> = {
	color: DefaultColorStyle,
	labelColor: DefaultLabelColorStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	fontSizeAdjustment: T.positiveNumber,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	growY: T.positiveNumber,
	url: T.linkUrl,
	richText: richTextValidator,
	scale: T.nonZeroNumber,
}

const Versions = createShapePropsMigrationIds('note', {
	AddUrlProp: 1,
	RemoveJustify: 2,
	MigrateLegacyAlign: 3,
	AddVerticalAlign: 4,
	MakeUrlsValid: 5,
	AddFontSizeAdjustment: 6,
	AddScale: 7,
	AddLabelColor: 8,
	AddRichText: 9,
})

/**
 * Version identifiers for note shape migrations. These version numbers track
 * significant schema changes over time, enabling proper data migration between versions.
 *
 * @public
 */
export { Versions as noteShapeVersions }

/**
 * Migration sequence for note shapes. Handles schema evolution over time by defining
 * how to upgrade and downgrade note shape data between different versions. Includes
 * migrations for URL properties, text alignment changes, vertical alignment addition,
 * font size adjustments, scaling support, label color, and the transition from plain text to rich text.
 *
 * @public
 */
export const noteShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.AddUrlProp,
			up: (props) => {
				props.url = ''
			},
			down: 'retired',
		},
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
			id: Versions.MigrateLegacyAlign,
			up: (props) => {
				switch (props.align) {
					case 'start':
						props.align = 'start-legacy'
						return
					case 'end':
						props.align = 'end-legacy'
						return
					default:
						props.align = 'middle-legacy'
						return
				}
			},
			down: 'retired',
		},
		{
			id: Versions.AddVerticalAlign,
			up: (props) => {
				props.verticalAlign = 'middle'
			},
			down: 'retired',
		},
		{
			id: Versions.MakeUrlsValid,
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
			id: Versions.AddFontSizeAdjustment,
			up: (props) => {
				props.fontSizeAdjustment = 0
			},
			down: (props) => {
				delete props.fontSizeAdjustment
			},
		},
		{
			id: Versions.AddScale,
			up: (props) => {
				props.scale = 1
			},
			down: (props) => {
				delete props.scale
			},
		},
		{
			id: Versions.AddLabelColor,
			up: (props) => {
				props.labelColor = 'black'
			},
			down: (props) => {
				delete props.labelColor
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
