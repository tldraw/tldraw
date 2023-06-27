import { defineMigrations, SerializedStore } from '@tldraw/store'
import { TLRecord } from './records/TLRecord'

const Versions = {
	RemoveCodeAndIconShapeTypes: 1,
	AddInstancePresenceType: 2,
	RemoveTLUserAndPresenceAndAddPointer: 3,
	RemoveUserDocument: 4,
} as const

export { Versions as storeVersions }

/** @public */
export const storeMigrations = defineMigrations({
	currentVersion: Versions.RemoveUserDocument,
	migrators: {
		[Versions.RemoveCodeAndIconShapeTypes]: {
			up: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(
						([_, v]) => v.typeName !== 'shape' || (v.type !== 'icon' && v.type !== 'code')
					)
				)
			},
			down: (store: SerializedStore<TLRecord>) => {
				// noop
				return store
			},
		},
		[Versions.AddInstancePresenceType]: {
			up: (store: SerializedStore<TLRecord>) => {
				return store
			},
			down: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => v.typeName !== 'instance_presence')
				)
			},
		},
		[Versions.RemoveTLUserAndPresenceAndAddPointer]: {
			up: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => !v.typeName.match(/^(user|user_presence)$/))
				)
			},
			down: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => v.typeName !== 'pointer')
				)
			},
		},
		[Versions.RemoveUserDocument]: {
			up: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => !v.typeName.match('user_document'))
				)
			},
			down: (store: SerializedStore<TLRecord>) => {
				return store
			},
		},
	},
})
