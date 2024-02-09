import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultDashStyle = StyleProp.defineEnum('tldraw:dash', {
	// 💡❗ If you remove a value from this enum, make sure you also add a migration.
	// 💡❗ (see the tlschema README.md for instructions)
	defaultValue: 'draw',
	values: ['draw', 'solid', 'dashed', 'dotted'],
})

/** @public */
export type TLDefaultDashStyle = T.TypeOf<typeof DefaultDashStyle>
