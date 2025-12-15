import { WhatsNewEntry } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { Atom, atom, fetch, getFromLocalStorage, setInLocalStorage } from 'tldraw'

const STORAGE_KEY = 'tldrawapp_whats_new'

// Load initial entries from localStorage
let initialEntries: WhatsNewEntry[] = []
try {
	const stored = getFromLocalStorage(STORAGE_KEY)
	if (stored) {
		const parsed = JSON.parse(stored)
		if (Array.isArray(parsed)) {
			initialEntries = parsed
		}
	}
} catch {
	// Empty on parse error
}

export const whatsNewEntriesAtom: Atom<WhatsNewEntry[]> = atom('whatsNewEntries', initialEntries)

export const whatsNewLoadedAtom: Atom<boolean> = atom('whatsNewLoaded', false)

export function TlaWhatsNewFetcher() {
	useEffect(() => {
		let mounted = true

		async function fetchWhatsNew() {
			try {
				const response = await fetch('/api/app/whats-new?limit=1')
				if (!response.ok) {
					console.error("Failed to fetch What's New:", response.statusText)
					if (mounted) {
						whatsNewLoadedAtom.set(true)
					}
					return
				}
				const data = await response.json()
				// API returns array directly, not wrapped in object
				if (mounted && Array.isArray(data)) {
					whatsNewEntriesAtom.set(data)
					setInLocalStorage(STORAGE_KEY, JSON.stringify(data))
					whatsNewLoadedAtom.set(true)
				}
			} catch (error) {
				console.error("Error fetching What's New:", error)
				if (mounted) {
					whatsNewLoadedAtom.set(true)
				}
			}
		}

		fetchWhatsNew()

		return () => {
			mounted = false
		}
	}, [])

	return null
}
