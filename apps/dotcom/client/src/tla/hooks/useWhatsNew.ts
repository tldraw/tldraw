import { useValue } from 'tldraw'
import { whatsNewEntriesAtom, whatsNewLoadedAtom } from '../utils/WhatsNewFetcher'

export function useWhatsNew() {
	const entries = useValue('whats-new-entries', () => whatsNewEntriesAtom.get(), [])
	const isLoaded = useValue('whats-new-loaded', () => whatsNewLoadedAtom.get(), [])
	return { entries, isLoaded }
}
