import { RemoteTLStoreWithStatus, UseSyncSnapshot } from '@tldraw/sync'
import { RefObject, useEffect, useRef } from 'react'
import { fetch } from 'tldraw'
import { trackEvent } from '../../utils/analytics'

const ACTIVITY_POLL_INTERVAL_MS = 15_000
const ACTIVITY_POLL_JITTER_MS = 2000

export type LazyUpgradeReason = 'first-edit' | 'others-present' | 'content-changed'

interface RoomActivity {
	activeSessions: number
	documentClock: number | null
	updatedAt: number
}

/**
 * Drive the lazy transport's upgrade triggers while a board is rendered from a REST snapshot:
 *
 * - the first document-scope user change (the same changes the sync client buffers as speculative
 *   edits) dials the websocket, so nothing can be edited without syncing;
 * - a poll of the room's activity endpoint dials when someone else is in the room or the content
 *   has moved past our snapshot. Polling pauses while the tab is hidden (with an immediate poll on
 *   return) and stops permanently once dialed.
 *
 * The chosen reason is written to `upgradeReasonRef` before dialing so the websocket URI can carry
 * it to the server's `lazy_socket_upgrade` metric.
 */
export function useLazySocketUpgrade({
	store,
	snapshot,
	upgradeReasonRef,
	fileSlug,
}: {
	store: RemoteTLStoreWithStatus
	snapshot: UseSyncSnapshot | undefined
	upgradeReasonRef: RefObject<LazyUpgradeReason | null>
	fileSlug: string
}) {
	const connect = store.status === 'synced-remote' ? store.connect : undefined
	const tlstore = store.status === 'synced-remote' ? store.store : undefined
	const didDialRef = useRef(false)

	useEffect(() => {
		if (!connect || !tlstore || !snapshot) return

		let stopped = false
		let timer: number | undefined

		const dial = (reason: LazyUpgradeReason) => {
			if (didDialRef.current) return
			didDialRef.current = true
			upgradeReasonRef.current = reason
			trackEvent('lazy-socket-upgrade', { reason })
			connect()
		}

		const unsubscribeFromEdits = tlstore.listen(
			() => {
				unsubscribeFromEdits()
				dial('first-edit')
			},
			{ source: 'user', scope: 'document' }
		)

		const seedClock = snapshot.snapshot.documentClock
		const poll = async () => {
			if (stopped || didDialRef.current || document.hidden) return
			try {
				const res = await fetch(`/api/app/file/${fileSlug}/activity`)
				if (!res.ok) return
				const activity = (await res.json()) as RoomActivity
				if (activity.activeSessions > 0) {
					dial('others-present')
				} else if (
					activity.documentClock !== null &&
					seedClock !== undefined &&
					activity.documentClock > seedClock
				) {
					dial('content-changed')
				}
			} catch (_e) {
				// The poll is advisory; a failed poll never blocks reading, and editing always
				// dials regardless.
			}
		}
		const schedule = () => {
			if (stopped || didDialRef.current) return
			timer = window.setTimeout(
				async () => {
					await poll()
					schedule()
				},
				ACTIVITY_POLL_INTERVAL_MS + Math.random() * ACTIVITY_POLL_JITTER_MS
			)
		}
		const onVisibilityChange = () => {
			if (!document.hidden) poll()
		}
		document.addEventListener('visibilitychange', onVisibilityChange)
		schedule()

		return () => {
			stopped = true
			unsubscribeFromEdits()
			if (timer !== undefined) clearTimeout(timer)
			document.removeEventListener('visibilitychange', onVisibilityChange)
		}
	}, [connect, tlstore, snapshot, fileSlug, upgradeReasonRef])
}
