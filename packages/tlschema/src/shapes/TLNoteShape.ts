import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RETIRED_DOWN_MIGRATION, RecordPropsType } from '../recordsWithProps'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultHorizontalAlignStyle } from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultVerticalAlignStyle } from '../styles/TLVerticalAlignStyle'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export const noteShapeProps = {
	color: DefaultColorStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	fontSizeAdjustment: T.positiveNumber,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	growY: T.positiveNumber,
	url: T.linkUrl,
	text: T.string,
}

/** @public */
export type TLNoteShapeProps = RecordPropsType<typeof noteShapeProps>

/** @public */
export type TLNoteShape = TLBaseShape<'note', TLNoteShapeProps>

const Versions = createShapePropsMigrationIds('note', {
	AddUrlProp: 1,
	RemoveJustify: 2,
	MigrateLegacyAlign: 3,
	AddVerticalAlign: 4,
	MakeUrlsValid: 5,
	AddFontSizeAdjustment: 6,
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
			down: RETIRED_DOWN_MIGRATION,
		},
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
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: Versions.AddVerticalAlign,
			up: (props) => {
				props.verticalAlign = 'middle'
			},
			down: RETIRED_DOWN_MIGRATION,
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
	],
})
