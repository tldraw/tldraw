import { useEffect } from 'react'
import { Atom, atom, fetch } from 'tldraw'

interface FeatureFlags {
	fairies_enabled: boolean
	fairies_purchase_enabled: boolean
}

// Global atom for feature flags
export const featureFlagsAtom: Atom<FeatureFlags> = atom('featureFlags', {
	fairies_enabled: false,
	fairies_purchase_enabled: false,
})

// Atom to track if flags have been loaded at least once
export const featureFlagsLoadedAtom: Atom<boolean> = atom('featureFlagsLoaded', false)

const REFETCH_INTERVAL = 60000 // 1 minute

export function FeatureFlagsFetcher() {
	useEffect(() => {
		let mounted = true

		async function fetchFlags() {
			try {
				const response = await fetch('/api/app/feature-flags')
				if (!response.ok) {
					console.error('Failed to fetch feature flags:', response.statusText)
					return
				}
				const data = await response.json()
				if (mounted) {
					featureFlagsAtom.set(data)
					featureFlagsLoadedAtom.set(true)
				}
			} catch (error) {
				console.error('Error fetching feature flags:', error)
			}
		}

		// Initial fetch
		fetchFlags()

		// Poll every minute
		const interval = setInterval(fetchFlags, REFETCH_INTERVAL)

		return () => {
			mounted = false
			clearInterval(interval)
		}
	}, [])

	return null
}
