import { AddToLibraryMenuItem, LibrariesPanel } from '@tldraw/libraries'
import { useMemo } from 'react'
import { useEditor, useToasts, useTranslation } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { getEditorLibraries } from './editorLibraries'
import { TlaBrowseStarterPacksMenuItem } from './TlaStarterPacksDialog'

function useEditorLibraries(fileId: string) {
	const app = useMaybeApp()
	const editor = useEditor()
	const toasts = useToasts()
	const msg = useTranslation()
	const userLibraries = app?.libraries
	return useMemo(
		() =>
			app && userLibraries
				? getEditorLibraries(app, userLibraries, editor, fileId, { toasts, msg })
				: null,
		[app, userLibraries, editor, fileId, toasts, msg]
	)
}

export function TlaLibrariesPanel({ fileId }: { fileId: string }) {
	const source = useEditorLibraries(fileId)
	if (!source) return null
	return (
		<LibrariesPanel source={source} menuItems={<TlaBrowseStarterPacksMenuItem source={source} />} />
	)
}

export function TlaAddToLibraryMenuItem({ fileId }: { fileId: string }) {
	const source = useEditorLibraries(fileId)
	if (!source) return null
	return <AddToLibraryMenuItem source={source} />
}
