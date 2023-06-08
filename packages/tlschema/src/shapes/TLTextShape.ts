import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLAlignType, alignValidator } from '../styles/TLAlignStyle'
import { TLColorType, colorValidator } from '../styles/TLColorStyle'
import { TLFontType, fontValidator } from '../styles/TLFontStyle'
import { TLSizeType, sizeValidator } from '../styles/TLSizeStyle'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'

/** @public */
export type TLTextShapeProps = {
	color: TLColorType
	size: TLSizeType
	font: TLFontType
	align: TLAlignType
	w: number
	text: string
	scale: number
	autoSize: boolean
}

/** @public */
export type TLTextShape = TLBaseShape<'text', TLTextShapeProps>

/** @internal */
export const textShapeValidator: T.Validator<TLTextShape> = createShapeValidator(
	'text',
	T.object({
		color: colorValidator,
		size: sizeValidator,
		font: fontValidator,
		align: alignValidator,
		w: T.nonZeroNumber,
		text: T.string,
		scale: T.nonZeroNumber,
		autoSize: T.boolean,
	})
)

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
