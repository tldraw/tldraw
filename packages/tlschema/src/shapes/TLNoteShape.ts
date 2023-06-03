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
	AddUrlProp: 1,
	RemoveJustify: 2,
	MigrateLegacyAlign: 3,
} as const

/** @public */
export const noteShapeTypeMigrations = defineMigrations({
	currentVersion: Versions.MigrateLegacyAlign,
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

		[Versions.MigrateLegacyAlign]: {
			up: (shape) => {
				let newAlign: TLAlignType
				switch (shape.props.align) {
					case 'start':
						newAlign = 'start-legacy' as TLAlignType
						break
					case 'end':
						newAlign = 'end-legacy' as TLAlignType
						break
					default:
						newAlign = 'middle-legacy' as TLAlignType
						break
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
				let oldAlign: TLAlignType
				switch (shape.props.align) {
					case 'start-legacy':
						oldAlign = 'start'
						break
					case 'end-legacy':
						oldAlign = 'end'
						break
					case 'middle-legacy':
						oldAlign = 'middle'
						break
					default:
						oldAlign = shape.props.align
				}
				return {
					...shape,
					props: {
						...shape.props,
						align: oldAlign,
					},
				}
			},
		},
	},
})
