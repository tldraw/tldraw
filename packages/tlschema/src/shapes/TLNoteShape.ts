import { defineMigrations } from '@tldraw/tlstore'
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
export type TLNoteShapeProps = {
	color: TLColorType
	size: TLSizeType
	font: TLFontType
	align: TLAlignType
	opacity: TLOpacityType
	growY: number
	url: string
	text: string
}

/** @public */
export type TLNoteShape = TLBaseShape<'note', TLNoteShapeProps>

/** @public */
export const noteShapeTypeValidator: T.Validator<TLNoteShape> = createShapeValidator(
	'note',
	T.object({
		color: colorValidator,
		size: sizeValidator,
		font: fontValidator,
		align: alignValidator,
		opacity: opacityValidator,
		growY: T.positiveNumber,
		url: T.string,
		text: T.string,
	})
)

const Versions = {
	Initial: 0,
	AddUrlProp: 1,
	RemoveJustify: 2,
} as const

/** @public */
export const noteShapeMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	currentVersion: Versions.RemoveJustify,
	migrators: {
		[Versions.AddUrlProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, url: '' } }
			},
			down: (shape) => {
				const { url: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
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
