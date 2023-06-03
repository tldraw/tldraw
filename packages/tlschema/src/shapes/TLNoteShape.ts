import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLAlignType, alignValidator } from '../styles/TLAlignStyle'
import { TLColorType, colorValidator } from '../styles/TLColorStyle'
import { TLFontType, fontValidator } from '../styles/TLFontStyle'
import { TLOpacityType, opacityValidator } from '../styles/TLOpacityStyle'
import { TLSizeType, sizeValidator } from '../styles/TLSizeStyle'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'

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
export const noteShapeValidator: T.Validator<TLNoteShape> = createShapeValidator(
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
export const noteShapeMigrations = defineMigrations({
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
