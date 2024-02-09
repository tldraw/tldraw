import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultVerticalAlignStyle = StyleProp.defineEnum('tldraw:verticalAlign', {
	// 💡❗ If you remove a value from this enum, make sure you also add a migration.
	// 💡❗ (see the tlschema README.md for instructions)
	defaultValue: 'middle',
	values: ['start', 'middle', 'end'],
})

/** @public */
export type TLDefaultVerticalAlignStyle = T.TypeOf<typeof DefaultVerticalAlignStyle>
