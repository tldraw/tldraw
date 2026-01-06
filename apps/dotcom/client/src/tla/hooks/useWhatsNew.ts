import { useValue } from 'tldraw'
import {
	whatsNewEntriesAtom,
	whatsNewLoadedAtom,
} from '../components/TlaWhatsNew/TlaWhatsNewFetcher'

export function useWhatsNew() {
	const entries = useValue('whats-new-entries', () => whatsNewEntriesAtom.get(), [])
	const isLoaded = useValue('whats-new-loaded', () => whatsNewLoadedAtom.get(), [])
	return { entries, isLoaded }
}
