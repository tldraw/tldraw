import { EvaluatedFeatureFlag, FeatureFlagKey } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { fetch } from 'tldraw'

export type FeatureFlags = Record<FeatureFlagKey, EvaluatedFeatureFlag>

const DEFAULT_FLAGS: FeatureFlags = {
	sqlite_file_storage: { enabled: false },
	proper_zero: { enabled: false },
}

// Module-level promise — starts fetching immediately on import
let flagsPromise: Promise<FeatureFlags> | null = null
let currentFlags: FeatureFlags = { ...DEFAULT_FLAGS }

export function fetchFeatureFlags(): Promise<FeatureFlags> {
	if (!flagsPromise) {
		flagsPromise = fetch('/api/app/feature-flags')
			.then((r) => (r.ok ? r.json() : DEFAULT_FLAGS))
			.catch(() => DEFAULT_FLAGS)
			.then((flags: FeatureFlags) => {
				currentFlags = flags
				return flags
			})
	}
	return flagsPromise
}

// Start immediately
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
			} catch {
				// ignore poll errors
			}
		}

		// Wait for the initial fetch to complete, then start polling
		fetchFeatureFlags().then(() => {
			if (!mounted) return
			prevProperZero = currentFlags.proper_zero?.enabled ?? false
		})

		const interval = setInterval(pollFlags, REFETCH_INTERVAL)

		return () => {
			mounted = false
			clearInterval(interval)
		}
	}, [])

	return null
}
