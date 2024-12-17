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
	 * The user's display name. If not given, 'New User' will be shown.
	 */
	name?: string | null
	/**
	 * The user's color. If not given, a random color will be assigned.
	 */
	color?: string | null
}

/**
 * Creates a derivation that represents the current presence state of the current user.
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

/** @public */
export type TLPresenceStateInfo = Parameters<(typeof InstancePresenceRecordType)['create']>[0]

/** @public */
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
