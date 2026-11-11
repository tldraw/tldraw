import { AddToLibraryMenuItem, LibrariesPanel } from '@tldraw/libraries'
import { useMemo } from 'react'
import { useEditor } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { getEditorLibraries } from './editorLibraries'
import { getStarterPacksSource } from './starterPacks'
import { TlaBrowseStarterPacksMenuItem } from './TlaStarterPacksDialog'

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

export function TlaLibrariesPanel({ fileId }: { fileId: string }) {
	const app = useMaybeApp()
	const source = useEditorLibraries(fileId)
	if (!app || !source) return null
	return (
		<LibrariesPanel
			source={source}
			side="right"
			menuItems={<TlaBrowseStarterPacksMenuItem packs={getStarterPacksSource(app.userId)} />}
		/>
	)
}

export function TlaAddToLibraryMenuItem({ fileId }: { fileId: string }) {
	const source = useEditorLibraries(fileId)
	if (!source) return null
	return <AddToLibraryMenuItem source={source} />
}
