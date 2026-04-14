import { EvaluatedFeatureFlag, FeatureFlagKey } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { fetch, getFromLocalStorage } from 'tldraw'

export type FeatureFlags = Record<FeatureFlagKey, EvaluatedFeatureFlag>

export const DEFAULT_FLAGS: FeatureFlags = {
	zero_enabled: { enabled: false },
	zero_kill_switch: { enabled: false },
	rum_enabled: { enabled: false },
}

let flagsPromise: Promise<FeatureFlags> | null = null
let currentFlags: FeatureFlags = { ...DEFAULT_FLAGS }
let _wasAuthenticated = false

export function fetchFeatureFlags(): Promise<FeatureFlags> {
	if (!flagsPromise) {
		flagsPromise = (async () => {
			try {
				const r = await fetch('/api/app/feature-flags')
				if (!r.ok) throw new Error(`HTTP ${r.status}`)
				_wasAuthenticated = r.headers.get('x-authenticated') === '1'
				if (!_wasAuthenticated) {
					// Allow subsequent callers to refetch once auth is available
					flagsPromise = null
				}
				const flags = await r.json()
				currentFlags = flags
				return flags as FeatureFlags
			} catch (err) {
				console.error('[FeatureFlags] fetch failed:', err)
				flagsPromise = null
				_wasAuthenticated = false
				currentFlags = { ...DEFAULT_FLAGS }
				return { ...DEFAULT_FLAGS }
			}
		})()
	}
	return flagsPromise
}

export function wasAuthenticated(): boolean {
	return _wasAuthenticated
}

// Start fetching immediately — fast path for returning users with valid cookies.
// If the session cookie is missing/expired the response header indicates the flags
// were evaluated without auth, and useAppState will retry once Clerk is ready.
fetchFeatureFlags()

const REFETCH_INTERVAL = 60000 // 1 minute

/**
 * Determines whether a flag change should trigger a page reload.
 * Only reloads when zero_kill_switch transitions to true AND the user
 * was actually using proper Zero (no point reloading polyfill users).
 */
export function shouldReloadForFlagChange(prev: FeatureFlags, next: FeatureFlags): boolean {
	const prevKillSwitch = prev.zero_kill_switch?.enabled
	const nextKillSwitch = next.zero_kill_switch?.enabled
	if (nextKillSwitch !== true || prevKillSwitch === true) return false
	// Only reload if this user was actually on proper Zero
	const wasUsingZero = prev.zero_enabled?.enabled || getFromLocalStorage('useProperZero') === 'true'
	return !!wasUsingZero
}

/**
 * Polls for feature flag changes after the initial fetch.
 * - zero_kill_switch: reload when it becomes true (emergency abort)
 * - zero_enabled: changes are silent, take effect on next page load
 */
export function FeatureFlagPoller() {
	useEffect(() => {
		let mounted = true
		let prevFlags: FeatureFlags = { ...currentFlags }

		async function pollFlags() {
			try {
				const response = await fetch('/api/app/feature-flags')
				if (!response.ok) return
				const data = await response.json()
				if (!mounted) return

				if (shouldReloadForFlagChange(prevFlags, data)) {
					location.reload()
					return
				}
				prevFlags = data
				currentFlags = data
			} catch (err) {
				console.warn('[FeatureFlags] poll error:', err)
			}
		}

		let interval: ReturnType<typeof setInterval>

		fetchFeatureFlags().then(() => {
			if (!mounted) return
			prevFlags = { ...currentFlags }
			interval = setInterval(pollFlags, REFETCH_INTERVAL)
		})

		return () => {
			mounted = false
			clearInterval(interval)
		}
	}, [])

	return null
}
