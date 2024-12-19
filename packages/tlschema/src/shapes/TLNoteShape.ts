import { T } from '@tldraw/validate'
import { TLRichText, richTextValidator, toRichText } from '../misc/TLRichText'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import {
	DefaultColorStyle,
	DefaultLabelColorStyle,
	TLDefaultColorStyle,
} from '../styles/TLColorStyle'
import { DefaultFontStyle, TLDefaultFontStyle } from '../styles/TLFontStyle'
import {
	DefaultHorizontalAlignStyle,
	TLDefaultHorizontalAlignStyle,
} from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import {
	DefaultVerticalAlignStyle,
	TLDefaultVerticalAlignStyle,
} from '../styles/TLVerticalAlignStyle'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLNoteShapeProps {
	color: TLDefaultColorStyle
	labelColor: TLDefaultColorStyle
	size: TLDefaultSizeStyle
	font: TLDefaultFontStyle
	fontSizeAdjustment: number
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	growY: number
	url: string
	richText: TLRichText
	scale: number
}

/** @public */
export type TLNoteShape = TLBaseShape<'note', TLNoteShapeProps>

/** @public */
export const noteShapeProps: RecordProps<TLNoteShape> = {
	color: DefaultColorStyle,
	labelColor: DefaultLabelColorStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	fontSizeAdjustment: T.positiveNumber,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	growY: T.positiveNumber,
	url: T.linkUrl,
	richText: richTextValidator,
	scale: T.nonZeroNumber,
}

const Versions = createShapePropsMigrationIds('note', {
	AddUrlProp: 1,
	RemoveJustify: 2,
	MigrateLegacyAlign: 3,
	AddVerticalAlign: 4,
	MakeUrlsValid: 5,
	AddFontSizeAdjustment: 6,
	AddScale: 7,
	AddLabelColor: 8,
	AddRichText: 9,
})

export { Versions as noteShapeVersions }

/** @public */
export const noteShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.AddUrlProp,
			up: (props) => {
				props.url = ''
			},
			down: 'retired',
		},
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
			id: Versions.MigrateLegacyAlign,
			up: (props) => {
				switch (props.align) {
					case 'start':
						props.align = 'start-legacy'
						return
					case 'end':
						props.align = 'end-legacy'
						return
					default:
						props.align = 'middle-legacy'
						return
				}
			},
			down: 'retired',
		},
		{
			id: Versions.AddVerticalAlign,
			up: (props) => {
				props.verticalAlign = 'middle'
			},
			down: 'retired',
		},
		{
			id: Versions.MakeUrlsValid,
			up: (props) => {
				if (!T.linkUrl.isValid(props.url)) {
					props.url = ''
				}
			},
			down: (_props) => {
				// noop
			},
		},
		{
			id: Versions.AddFontSizeAdjustment,
			up: (props) => {
				props.fontSizeAdjustment = 0
			},
			down: (props) => {
				delete props.fontSizeAdjustment
			},
		},
		{
			id: Versions.AddScale,
			up: (props) => {
				props.scale = 1
			},
			down: (props) => {
				delete props.scale
			},
		},
		{
			id: Versions.AddLabelColor,
			up: (props) => {
				props.labelColor = 'black'
			},
			down: (props) => {
				delete props.labelColor
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
