import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultHorizontalAlignStyle } from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const textShapeProps = {
	color: DefaultColorStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	w: T.nonZeroNumber,
	text: T.string,
	scale: T.nonZeroNumber,
	autoSize: T.boolean,
}

/** @public */
export type TLTextShapeProps = ShapePropsType<typeof textShapeProps>

/** @public */
export type TLTextShape = TLBaseShape<'text', TLTextShapeProps>

const Versions = {
	RemoveJustify: 1,
} as const

/** @internal */
export const textShapeMigrations = defineMigrations({
	currentVersion: Versions.RemoveJustify,
	migrators: {
		[Versions.RemoveJustify]: {
			up: (shape) => {
				let newAlign = shape.props.align
				if (newAlign === 'justify') {
					newAlign = 'start'
				}

				return {
					...shape,
					props: {
						...shape.props,
						align: newAlign,
					},
				}
			},
			down: (shape) => {
				return { ...shape }
			},
		},
	},
})
