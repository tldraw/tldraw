import { AddToLibraryMenuItem, LibrariesPanel } from '@tldraw/libraries'
import { useMaybeApp } from '../../hooks/useAppState'

export function TlaLibrariesPanel() {
	const source = useMaybeApp()?.libraries
	if (!source) return null
	return <LibrariesPanel source={source} side="right" />
}

export function TlaAddToLibraryMenuItem() {
	const source = useMaybeApp()?.libraries
	if (!source) return null
	return <AddToLibraryMenuItem source={source} />
}
