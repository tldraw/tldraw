import { T } from '@tldraw/validate'
import { TLRichText, richTextValidator, toRichText } from '../misc/TLRichText'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle, TLDefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultTextAlignStyle, TLDefaultTextAlignStyle } from '../styles/TLTextAlignStyle'
import { TLBaseShape } from './TLBaseShape'

/** @public */
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

/** @public */
export type TLTextShape = TLBaseShape<'text', TLTextShapeProps>

/** @public */
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

export { Versions as textShapeVersions }

/** @public */
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
