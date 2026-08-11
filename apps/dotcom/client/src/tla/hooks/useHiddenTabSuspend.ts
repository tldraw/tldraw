import { ClientWebSocketAdapter, TLSyncClient } from '@tldraw/sync-core'
import { RefObject, useEffect } from 'react'
import { TLRecord, TLStore } from 'tldraw'
import { useMaybeApp } from './useAppState'

/** How long a tab must stay hidden before its sync socket is dropped; must comfortably exceed quick tab-switch flapping */
const SUSPEND_AFTER_HIDDEN_MS = 2 * 60 * 1000
/** Re-check cadence while waiting for pending changes to drain (the browser throttles this to ~1/min when hidden) */
const RETRY_INTERVAL_MS = 10 * 1000

/**
 * Suspends the sync websocket while the tab is hidden so the server room can go idle,
 * and resumes it the moment the tab is visible again. Gated by the hidden_tab_suspend flag.
 */
export function useHiddenTabSuspend(clientRef: RefObject<TLSyncClient<TLRecord, TLStore> | null>) {
	const enabled = useMaybeApp()?.isHiddenTabSuspendEnabled ?? false

	useEffect(() => {
		if (!enabled) return

		let hiddenAt: number | null = null
		let timer: ReturnType<typeof setTimeout> | null = null
		let paused = false

		function getAdapter(): ClientWebSocketAdapter | null {
			const socket = clientRef.current?.socket
			return socket instanceof ClientWebSocketAdapter && !socket.isDisposed ? socket : null
		}

		function clearTimer() {
			if (timer) {
				clearTimeout(timer)
				timer = null
			}
		}

		function trySuspend() {
			timer = null
			if (paused || document.visibilityState !== 'hidden' || hiddenAt === null) return
			const client = clientRef.current
			const adapter = getAdapter()
			// client/adapter may not exist yet (or mid-recreation); keep retrying rather than giving up
			if (!client || !adapter) {
				timer = setTimeout(trySuspend, RETRY_INTERVAL_MS)
				return
			}
			// unconfirmed changes must drain before we cut the socket; check again later
			if (Date.now() - hiddenAt < SUSPEND_AFTER_HIDDEN_MS || client.hasPendingChanges()) {
				timer = setTimeout(trySuspend, RETRY_INTERVAL_MS)
				return
			}
			adapter.pause()
			paused = true
		}

		// arms the suspend timer for an already-hidden tab; also covers tabs that mount hidden
		function enterHidden() {
			if (hiddenAt !== null) return
			hiddenAt = Date.now()
			timer = setTimeout(trySuspend, SUSPEND_AFTER_HIDDEN_MS)
		}

		function resume() {
			hiddenAt = null
			clearTimer()
			if (paused) {
				paused = false
				getAdapter()?.resume()
			}
			// spurious resume (e.g. synthetic input) while still hidden: restart the suspend chain
			if (document.visibilityState === 'hidden') enterHidden()
		}

		function onVisibilityChange() {
			if (document.visibilityState === 'hidden') {
				enterHidden()
			} else {
				resume()
			}
		}

		// a tab opened in the background starts hidden and gets no visibilitychange event until revealed
		if (document.visibilityState === 'hidden') enterHidden()

		// user input implies visible even if a visibility event was missed
		document.addEventListener('visibilitychange', onVisibilityChange)
		document.addEventListener('pointerdown', resume, { capture: true })
		document.addEventListener('keydown', resume, { capture: true })

		return () => {
			clearTimer()
			document.removeEventListener('visibilitychange', onVisibilityChange)
			document.removeEventListener('pointerdown', resume, { capture: true })
			document.removeEventListener('keydown', resume, { capture: true })
			// never leave a socket paused behind us; safe no-op if useSync's cleanup already closed the socket
			if (paused) getAdapter()?.resume()
		}
	}, [enabled, clientRef])
}
