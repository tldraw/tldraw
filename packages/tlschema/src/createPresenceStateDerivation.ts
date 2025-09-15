import { Signal, computed } from '@tldraw/state'
import { TLStore } from './TLStore'
import { CameraRecordType } from './records/TLCamera'
import { TLINSTANCE_ID } from './records/TLInstance'
import { InstancePageStateRecordType } from './records/TLPageState'
import { TLPOINTER_ID } from './records/TLPointer'
import { InstancePresenceRecordType, TLInstancePresence } from './records/TLPresence'

/**
 * The information about a user which is used for multiplayer features.
 * @public
 */
export interface TLPresenceUserInfo {
	/**
	 * id - A unique identifier for the user. This should be the same across all devices and sessions.
	 */
	id: string
	/**
	 * The user's display name.
	 */
	name?: string | null
	/**
	 * The user's color. If not given, a random color will be assigned.
	 */
	color?: string | null
}

/**
 * Creates a derivation that represents the current presence state of the current user.
 *
 * This function returns a derivation factory that, when given a store, creates a computed signal
 * containing the user's current presence state. The presence state includes information like cursor
 * position, selected shapes, camera position, and user metadata that gets synchronized in
 * multiplayer scenarios.
 *
 * @param $user - A reactive signal containing the user information
 * @param instanceId - Optional custom instance ID. If not provided, one will be generated based on the store ID
 * @returns A function that takes a store and returns a computed signal of the user's presence state
 *
 * @example
 * ```ts
 * import { createPresenceStateDerivation } from '@tldraw/tlschema'
 * import { atom } from '@tldraw/state'
 *
 * const userSignal = atom('user', { id: 'user-123', name: 'Alice', color: '#ff0000' })
 * const presenceDerivation = createPresenceStateDerivation(userSignal)
 *
 * // Use with a store to get reactive presence state
 * const presenceState = presenceDerivation(store)
 * console.log(presenceState.get()) // Current user presence or null
 * ```
 *
 * @public
 */
export function createPresenceStateDerivation(
	$user: Signal<TLPresenceUserInfo>,
	instanceId?: TLInstancePresence['id']
) {
	return (store: TLStore): Signal<TLInstancePresence | null> => {
		return computed('instancePresence', () => {
			const user = $user.get()
			if (!user) return null

			const state = getDefaultUserPresence(store, user)
			if (!state) return null

			return InstancePresenceRecordType.create({
				...state,
				id: instanceId ?? InstancePresenceRecordType.createId(store.id),
			})
		})
	}
}

/**
 * The shape of data used to create a presence record.
 *
 * This type represents all the properties needed to construct a TLInstancePresence record.
 * It includes user information, cursor state, camera position, selected shapes, and other
 * presence-related data that gets synchronized across multiplayer clients.
 *
 * @public
 */
export type TLPresenceStateInfo = Parameters<(typeof InstancePresenceRecordType)['create']>[0]

/**
 * Creates default presence state information for a user based on the current store state.
 *
 * This function extracts the current state from various store records (instance, page state,
 * camera, pointer) and combines them with user information to create a complete presence
 * state object. This is commonly used as a starting point for custom presence implementations.
 *
 * @param store - The tldraw store containing the current editor state
 * @param user - The user information to include in the presence state
 * @returns The default presence state info, or null if required store records are missing
 *
 * @example
 * ```ts
 * import { getDefaultUserPresence } from '@tldraw/tlschema'
 *
 * const user = { id: 'user-123', name: 'Alice', color: '#ff0000' }
 * const presenceInfo = getDefaultUserPresence(store, user)
 *
 * if (presenceInfo) {
 *   console.log('Current cursor:', presenceInfo.cursor)
 *   console.log('Selected shapes:', presenceInfo.selectedShapeIds)
 *   console.log('Camera position:', presenceInfo.camera)
 * }
 * ```
 *
 * @example
 * ```ts
 * // Common pattern: customize default presence
 * const customPresence = {
 *   ...getDefaultUserPresence(store, user),
 *   // Remove camera for privacy
 *   camera: undefined,
 *   // Add custom metadata
 *   customField: 'my-data'
 * }
 * ```
 *
 * @public
 */
export function getDefaultUserPresence(store: TLStore, user: TLPresenceUserInfo) {
	const instance = store.get(TLINSTANCE_ID)
	const pageState = store.get(InstancePageStateRecordType.createId(instance?.currentPageId))
	const camera = store.get(CameraRecordType.createId(instance?.currentPageId))
	const pointer = store.get(TLPOINTER_ID)
	if (!pageState || !instance || !camera || !pointer) {
		return null
	}

	return {
		selectedShapeIds: pageState.selectedShapeIds,
		brush: instance.brush,
		scribbles: instance.scribbles,
		userId: user.id,
		userName: user.name ?? '',
		followingUserId: instance.followingUserId,
		camera: {
			x: camera.x,
			y: camera.y,
			z: camera.z,
		},
		color: user.color ?? '#FF0000',
		currentPageId: instance.currentPageId,
		cursor: {
			x: pointer.x,
			y: pointer.y,
			rotation: instance.cursor.rotation,
			type: instance.cursor.type,
		},
		lastActivityTimestamp: pointer.lastActivityTimestamp,
		screenBounds: instance.screenBounds,
		chatMessage: instance.chatMessage,
		meta: {},
	} satisfies TLPresenceStateInfo
}
