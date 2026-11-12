import { AddToLibraryMenuItem, LibrariesPanel } from '@tldraw/libraries'
import { useEffect, useMemo } from 'react'
import { useEditor } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { getEditorLibraries } from './editorLibraries'
import {
	getStarterPacksSource,
	refreshStarterPacksWhenSeen,
	type StarterPacksSource,
} from './starterPacks'
import {
	TlaBrowseStarterPacksMenuItem,
	TlaRemoveStarterPackMenuItem,
} from './TlaStarterPacksDialog'

function useEditorLibraries(fileId: string) {
	const app = useMaybeApp()
	const editor = useEditor()
	const userLibraries = app?.libraries
	return useMemo(
		() =>
			app && userLibraries
				? getEditorLibraries(app, userLibraries, getStarterPacksSource(app.userId), editor, fileId)
				: null,
		[app, userLibraries, editor, fileId]
	)
}

function useRefreshStarterPacks(packs: StarterPacksSource | null) {
	const editor = useEditor()
	useEffect(() => (packs ? refreshStarterPacksWhenSeen(editor, packs) : undefined), [editor, packs])
}

export function TlaLibrariesPanel({ fileId }: { fileId: string }) {
	const app = useMaybeApp()
	const source = useEditorLibraries(fileId)
	useRefreshStarterPacks(app && source ? getStarterPacksSource(app.userId) : null)
	if (!app || !source) return null
	const packs = getStarterPacksSource(app.userId)
	return (
		<LibrariesPanel
			source={source}
			side="right"
			menuItems={<TlaBrowseStarterPacksMenuItem packs={packs} />}
			libraryMenuItems={(library) => (
				<TlaRemoveStarterPackMenuItem packs={packs} library={library} />
			)}
		/>
	)
}

export function TlaAddToLibraryMenuItem({ fileId }: { fileId: string }) {
	const source = useEditorLibraries(fileId)
	if (!source) return null
	return <AddToLibraryMenuItem source={source} />
}
