import { Signal, computed } from 'signia'
import { TLStore } from './TLStore'
import { TLInstancePresence } from './records/TLInstancePresence'

/** @internal */
export const defaultDerivePresenceState = (store: TLStore): Signal<TLInstancePresence | null> => {
	const $instance = store.query.record('instance', () => ({
		id: { eq: store.props.instanceId },
	}))
	const $user = store.query.record('user', () => ({ id: { eq: store.props.userId } }))
	const $userPresence = store.query.record('user_presence', () => ({
		userId: { eq: store.props.userId },
	}))
	const $pageState = store.query.record('instance_page_state', () => ({
		instanceId: { eq: store.props.instanceId },
		pageId: { eq: $instance.value?.currentPageId ?? ('' as any) },
	}))
	const $camera = store.query.record('camera', () => ({
		id: { eq: $pageState.value?.cameraId ?? ('' as any) },
	}))
	return computed('instancePresence', () => {
		const pageState = $pageState.value
		const instance = $instance.value
		const user = $user.value
		const userPresence = $userPresence.value
		const camera = $camera.value
		if (!pageState || !instance || !user || !userPresence || !camera) {
			return null
		}

		return TLInstancePresence.create({
			id: TLInstancePresence.createCustomId(store.props.instanceId),
			instanceId: store.props.instanceId,
			selectedIds: pageState.selectedIds,
			brush: instance.brush,
			scribble: instance.scribble,
			userId: store.props.userId,
			userName: user.name,
			followingUserId: instance.followingUserId,
			camera: {
				x: camera.x,
				y: camera.y,
				z: camera.z,
			},
			color: userPresence.color,
			currentPageId: instance.currentPageId,
			cursor: {
				x: userPresence.cursor.x,
				y: userPresence.cursor.y,
				rotation: instance.cursor.rotation,
				type: instance.cursor.type,
			},
			lastActivityTimestamp: userPresence.lastActivityTimestamp,
			screenBounds: instance.screenBounds,
		})
	})
}
