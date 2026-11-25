import {
	AddToLibraryMenuItem,
	CommandPaletteLibrariesGroup,
	LibrariesPanel,
	librariesPanelOpen,
} from '@tldraw/libraries'
import { useEffect, useMemo } from 'react'
import { useEditor, useToasts, useTranslation, useValue } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { getEditorLibraries } from './editorLibraries'
import { loadStarterPackSummaries } from './starterPacks'
import {
	TlaBrowseStarterPacksCommandPaletteItem,
	TlaBrowseStarterPacksMenuItem,
} from './TlaStarterPacksDialog'

function useEditorLibraries(fileId: string | undefined) {
	const app = useMaybeApp()
	const editor = useEditor()
	const toasts = useToasts()
	const msg = useTranslation()
	const userLibraries = app?.libraries
	return useMemo(
		() =>
			app && userLibraries && fileId
				? getEditorLibraries(app, userLibraries, editor, fileId, { toasts, msg })
				: null,
		[app, userLibraries, editor, fileId, toasts, msg]
	)
}

export function TlaLibrariesPanel({ fileId }: { fileId: string }) {
	const editor = useEditor()
	const source = useEditorLibraries(fileId)
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])

	// Fetch the starter packs dialog's data before it's opened, so its cards show straight away.
	// The dialog reports a failure itself.
	useEffect(() => {
		if (open && source) loadStarterPackSummaries().catch(() => {})
	}, [open, source])

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

export function TlaLibrariesCommandPaletteGroup() {
	const source = useEditorLibraries(useCurrentFileId())
	if (!source) return null
	return (
		<CommandPaletteLibrariesGroup source={source}>
			<TlaBrowseStarterPacksCommandPaletteItem source={source} />
		</CommandPaletteLibrariesGroup>
	)
}
