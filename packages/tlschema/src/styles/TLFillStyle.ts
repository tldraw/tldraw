import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultFillStyle = StyleProp.defineEnum('tldraw:fill', {
	// 💡❗ If you remove a value from this enum, make sure you also add a migration.
	// 💡❗ (see the tlschema README.md for instructions)
	defaultValue: 'none',
	values: ['none', 'semi', 'solid', 'pattern'],
})

/** @public */
export type TLDefaultFillStyle = T.TypeOf<typeof DefaultFillStyle>
