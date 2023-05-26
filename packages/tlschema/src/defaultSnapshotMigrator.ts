import { Migrator, StoreSnapshot } from '@tldraw/tlstore'
import { TLRecord } from './TLRecord'

/** @public */
export const storeVersions = {
	RemoveCodeAndIconShapeTypes: 1,
	AddInstancePresenceType: 2,
	RemoveTLUserAndPresenceAndAddPointer: 3,
} as const

const Versions = storeVersions

/** @public */
export const defaultSnapshotMigrator = new Migrator({
	currentVersion: Versions.RemoveTLUserAndPresenceAndAddPointer,
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
		[Versions.RemoveTLUserAndPresenceAndAddPointer]: {
			up: (store: StoreSnapshot<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => !v.typeName.match(/^(user|user_presence)$/))
				)
			},
			down: (store: StoreSnapshot<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => v.typeName !== 'pointer')
				)
			},
		},
	},
})
