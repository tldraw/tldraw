import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RETIRED_DOWN_MIGRATION, RecordPropsType } from '../recordsWithProps'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultTextAlignStyle } from '../styles/TLTextAlignStyle'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export const textShapeProps = {
	color: DefaultColorStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	textAlign: DefaultTextAlignStyle,
	w: T.nonZeroNumber,
	text: T.string,
	scale: T.nonZeroNumber,
	autoSize: T.boolean,
}

/** @public */
export type TLTextShapeProps = RecordPropsType<typeof textShapeProps>

/** @public */
export type TLTextShape = TLBaseShape<'text', TLTextShapeProps>

const Versions = createShapePropsMigrationIds('text', {
	RemoveJustify: 1,
	AddTextAlign: 2,
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
			down: RETIRED_DOWN_MIGRATION,
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
	],
})
