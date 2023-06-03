import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/tlvalidate'
import { TLAlignType, TLColorType, TLFontType, TLOpacityType, TLSizeType } from '../style-types'
import {
	alignValidator,
	colorValidator,
	fontValidator,
	opacityValidator,
	sizeValidator,
} from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLTextShapeProps = {
	color: TLColorType
	size: TLSizeType
	font: TLFontType
	align: TLAlignType
	opacity: TLOpacityType
	w: number
	text: string
	scale: number
	autoSize: boolean
}

/** @public */
export type TLTextShape = TLBaseShape<'text', TLTextShapeProps>

/** @public */
export const textShapeTypeValidator: T.Validator<TLTextShape> = createShapeValidator(
	'text',
	T.object({
		color: colorValidator,
		size: sizeValidator,
		font: fontValidator,
		align: alignValidator,
		opacity: opacityValidator,
		w: T.nonZeroNumber,
		text: T.string,
		scale: T.nonZeroNumber,
		autoSize: T.boolean,
	})
)

const Versions = {
	RemoveJustify: 1,
} as const

/** @public */
export const textShapeTypeMigrations = defineMigrations({
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
