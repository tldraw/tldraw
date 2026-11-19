import {
	AddToLibraryMenuItem,
	type LibrariesComponents,
	LibrariesPanel,
	librariesPanelOpen,
} from '@tldraw/libraries'
import { useEffect, useMemo } from 'react'
import { useEditor, useToasts, useTranslation, useValue } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getEditorLibraries } from './editorLibraries'
import { loadStarterPackSummaries } from './starterPacks'
import { TlaBrowseStarterPacksMenuItem } from './TlaStarterPacksDialog'
import { TlaTrackedItemTile } from './TlaTrackedItemTile'
import { trackLibrarySource } from './trackLibrarySource'

const libraryComponents: LibrariesComponents = { ItemTile: TlaTrackedItemTile }

function useEditorLibraries(fileId: string) {
	const app = useMaybeApp()
	const editor = useEditor()
	const toasts = useToasts()
	const msg = useTranslation()
	const trackEvent = useTldrawAppUiEvents()
	const userLibraries = app?.libraries
	return useMemo(
		() =>
			app && userLibraries
				? trackLibrarySource(
						getEditorLibraries(app, userLibraries, editor, fileId, { toasts, msg }),
						trackEvent
					)
				: null,
		[app, userLibraries, editor, fileId, toasts, msg, trackEvent]
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
		<LibrariesPanel
			source={source}
			components={libraryComponents}
			menuItems={<TlaBrowseStarterPacksMenuItem source={source} />}
		/>
	)
}

export function TlaAddToLibraryMenuItem({ fileId }: { fileId: string }) {
	const source = useEditorLibraries(fileId)
	if (!source) return null
	return <AddToLibraryMenuItem source={source} />
}
