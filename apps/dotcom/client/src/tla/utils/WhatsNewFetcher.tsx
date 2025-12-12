import { WhatsNewEntry } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { Atom, atom, fetch } from 'tldraw'

export const whatsNewEntriesAtom: Atom<WhatsNewEntry[]> = atom('whatsNewEntries', [])

export const whatsNewLoadedAtom: Atom<boolean> = atom('whatsNewLoaded', false)

export function WhatsNewFetcher() {
	useEffect(() => {
		let mounted = true

		async function fetchWhatsNew() {
			try {
				const response = await fetch('/api/app/whats-new')
				if (!response.ok) {
					console.error("Failed to fetch What's New:", response.statusText)
					return
				}
				const data = await response.json()
				if (mounted) {
					whatsNewEntriesAtom.set(data)
					whatsNewLoadedAtom.set(true)
				}
			} catch (error) {
				console.error("Error fetching What's New:", error)
			}
		}

		fetchWhatsNew()

		return () => {
			mounted = false
		}
	}, [])

	return null
}
