import { EvaluatedFeatureFlag, FeatureFlagKey } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { fetch } from 'tldraw'

export type FeatureFlags = Record<FeatureFlagKey, EvaluatedFeatureFlag>

const DEFAULT_FLAGS: FeatureFlags = {
	sqlite_file_storage: { enabled: false },
	proper_zero: { enabled: false },
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
 * React component that polls for feature flag changes after the initial fetch.
 * If proper_zero changes, it reloads the page.
 */
export function FeatureFlagPoller() {
	useEffect(() => {
		let mounted = true
		let prevProperZero = currentFlags.proper_zero?.enabled ?? false

		async function pollFlags() {
			try {
				const response = await fetch('/api/app/feature-flags')
				if (!response.ok) return
				const data = await response.json()
				if (!mounted) return

				const properZero = data.proper_zero?.enabled ?? false
				if (properZero !== prevProperZero) {
					location.reload()
					return
				}
				prevProperZero = properZero
				currentFlags = data
			} catch (err) {
				console.warn('[FeatureFlags] poll error:', err)
			}
		}

		let interval: ReturnType<typeof setInterval>

		fetchFeatureFlags().then(() => {
			if (!mounted) return
			prevProperZero = currentFlags.proper_zero?.enabled ?? false
			interval = setInterval(pollFlags, REFETCH_INTERVAL)
		})

		return () => {
			mounted = false
			clearInterval(interval)
		}
	}, [])

	return null
}
