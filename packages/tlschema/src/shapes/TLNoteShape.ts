import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import {
	DefaultHorizontalAlignStyle,
	TLDefaultHorizontalAlignStyle,
} from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultVerticalAlignStyle } from '../styles/TLVerticalAlignStyle'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const noteShapeProps = {
	color: DefaultColorStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	growY: T.positiveNumber,
	url: T.string,
	text: T.string,
}

/** @public */
export type TLNoteShapeProps = ShapePropsType<typeof noteShapeProps>

/** @public */
export type TLNoteShape = TLBaseShape<'note', TLNoteShapeProps>

const Versions = {
	AddUrlProp: 1,
	RemoveJustify: 2,
	MigrateLegacyAlign: 3,
	AddVerticalAlign: 4,
} as const

/** @internal */
export const noteShapeMigrations = defineMigrations({
	currentVersion: Versions.AddVerticalAlign,
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
				let newAlign: TLDefaultHorizontalAlignStyle
				switch (shape.props.align) {
					case 'start':
						newAlign = 'start-legacy'
						break
					case 'end':
						newAlign = 'end-legacy'
						break
					default:
						newAlign = 'middle-legacy'
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
				let oldAlign: TLDefaultHorizontalAlignStyle
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
		[Versions.AddVerticalAlign]: {
			up: (shape) => {
				return {
					...shape,
					props: {
						...shape.props,
						verticalAlign: 'middle',
					},
				}
			},
			down: (shape) => {
				const { verticalAlign: _, ...props } = shape.props

				return {
					...shape,
					props,
				}
			},
		},
	},
})
