import { UseSyncSnapshot } from '@tldraw/sync'
import { useEffect, useState } from 'react'
import { fetch } from 'tldraw'
import { trackEvent } from '../../utils/analytics'
import { fetchFeatureFlags } from '../utils/FeatureFlagPoller'
import { useTldrawCurrentUser } from './useUser'

const FLAG_RESOLVE_TIMEOUT_MS = 3000

export type LazyBoardSnapshotState =
	| { state: 'pending' }
	| { state: 'ready'; snapshot: UseSyncSnapshot | undefined }

/**
 * Resolve whether this board load should use the lazy transport, and if so fetch its REST
 * snapshot. Resolves to `snapshot: undefined` — meaning "use the plain websocket path" — for
 * anonymous users, when the `lazy_board_socket` flag is off, and on any fetch failure (including
 * the 404 a never-persisted new file returns).
 */
export function useLazyBoardSnapshot(fileSlug: string): LazyBoardSnapshotState {
	const user = useTldrawCurrentUser()
	const [result, setResult] = useState<LazyBoardSnapshotState>({ state: 'pending' })

	useEffect(() => {
		let cancelled = false
		const finish = (snapshot: UseSyncSnapshot | undefined) => {
			if (!cancelled) setResult({ state: 'ready', snapshot })
		}
		setResult({ state: 'pending' })

		// The flag is percentage-based and signed-in only; anonymous visitors keep the plain
		// websocket path.
		if (!user) {
			finish(undefined)
			return
		}

		;(async () => {
			try {
				// Flags normally resolve well before an editor mounts; the timeout keeps a hung
				// flags fetch from delaying the board.
				const flags = await Promise.race([
					fetchFeatureFlags(),
					new Promise<null>((resolve) => setTimeout(() => resolve(null), FLAG_RESOLVE_TIMEOUT_MS)),
				])
				const enabled = user.isTldraw || (flags?.lazy_board_socket?.enabled ?? false)
				if (!enabled) return finish(undefined)

				const res = await fetch(`/api/app/file/${fileSlug}/snapshot`, {
					headers: { Authorization: `Bearer ${await user.getToken()}` },
				})
				if (!res.ok) {
					// Expected for brand-new files (404 not-persisted); everything else is worth a
					// datapoint but never worth blocking the board — the socket path always works.
					trackEvent('lazy-snapshot-fallback', { status: res.status })
					return finish(undefined)
				}
				const data = await res.json()
				if (!data?.snapshot?.schema || typeof data.snapshot.documentClock !== 'number') {
					trackEvent('lazy-snapshot-fallback', { status: 'malformed' })
					return finish(undefined)
				}
				finish({
					snapshot: data.snapshot,
					isReadonly: data.isReadonly,
					objectAccess: data.objectAccess,
				})
			} catch (_e) {
				trackEvent('lazy-snapshot-fallback', { status: 'error' })
				finish(undefined)
			}
		})()

		return () => {
			cancelled = true
		}
	}, [fileSlug, user])

	return result
}
