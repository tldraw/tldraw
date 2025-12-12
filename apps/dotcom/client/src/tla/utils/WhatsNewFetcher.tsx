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

export function WhatsNewFetcher() {
	useEffect(() => {
		let mounted = true

		async function fetchWhatsNew() {
			try {
				const response = await fetch('/api/app/whats-new')
				if (!response.ok) {
					console.error("Failed to fetch What's New:", response.statusText)
					if (mounted) {
						whatsNewLoadedAtom.set(true)
					}
					return
				}
				const data = await response.json()
				if (mounted && data.entries) {
					whatsNewEntriesAtom.set(data.entries)
					setInLocalStorage(STORAGE_KEY, JSON.stringify(data.entries))
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
