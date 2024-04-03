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
	fontSizeAdjustment: T.positiveNumber,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	growY: T.positiveNumber,
	url: T.linkUrl,
	text: T.string,
}

/** @public */
export type TLNoteShapeProps = ShapePropsType<typeof noteShapeProps>

/** @public */
export type TLNoteShape = TLBaseShape<'note', TLNoteShapeProps>

export const noteShapeVersions = {
	AddUrlProp: 1,
	RemoveJustify: 2,
	MigrateLegacyAlign: 3,
	AddVerticalAlign: 4,
	MakeUrlsValid: 5,
	AddFontSizeAdjustment: 6,
} as const

/** @internal */
export const noteShapeMigrations = defineMigrations({
	currentVersion: noteShapeVersions.AddFontSizeAdjustment,
	migrators: {
		[noteShapeVersions.AddUrlProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, url: '' } }
			},
			down: (shape) => {
				const { url: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
		[noteShapeVersions.RemoveJustify]: {
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

		[noteShapeVersions.MigrateLegacyAlign]: {
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
		[noteShapeVersions.AddVerticalAlign]: {
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
		[noteShapeVersions.MakeUrlsValid]: {
			up: (shape) => {
				const url = shape.props.url
				if (url !== '' && !T.linkUrl.isValid(shape.props.url)) {
					return { ...shape, props: { ...shape.props, url: '' } }
				}
				return shape
			},
			down: (shape) => shape,
		},
		[noteShapeVersions.AddFontSizeAdjustment]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, fontSizeAdjustment: 0 } }
			},
			down: (shape) => {
				const { fontSizeAdjustment: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
	},
})
