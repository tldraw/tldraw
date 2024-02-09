import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultHorizontalAlignStyle = StyleProp.defineEnum('tldraw:horizontalAlign', {
	// 💡❗ If you remove a value from this enum, make sure you also add a migration.
	// 💡❗ (see the tlschema README.md for instructions)
	defaultValue: 'middle',
	values: ['start', 'middle', 'end', 'start-legacy', 'end-legacy', 'middle-legacy'],
})

/** @public */
export type TLDefaultHorizontalAlignStyle = T.TypeOf<typeof DefaultHorizontalAlignStyle>
