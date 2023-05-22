import { defineMigrations, StoreSnapshot } from '@tldraw/tlstore'
import { TLRecord } from './TLRecord'

const Versions = {
	RemoveCodeAndIconShapeTypes: 1,
	AddInstancePresenceType: 2,
} as const

/** @public */
export const storeMigrations = defineMigrations({
	currentVersion: Versions.AddInstancePresenceType,
	migrators: {
		[Versions.RemoveCodeAndIconShapeTypes]: {
			up: (store: StoreSnapshot<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(
						([_, v]) => v.typeName !== 'shape' || (v.type !== 'icon' && v.type !== 'code')
					)
				)
			},
			down: (store: StoreSnapshot<TLRecord>) => {
				// noop
				return store
			},
		},
		[Versions.AddInstancePresenceType]: {
			up: (store: StoreSnapshot<TLRecord>) => {
				return store
			},
			down: (store: StoreSnapshot<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => v.typeName !== 'instance_presence')
				)
			},
		},
	},
})
