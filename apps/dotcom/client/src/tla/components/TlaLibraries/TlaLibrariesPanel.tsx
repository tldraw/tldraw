import {
	AddToLibraryMenuItem,
	CommandPaletteLibrariesGroup,
	LibrariesPanel,
	librariesPanelOpen,
	type LibrarySource,
} from '@tldraw/libraries'
import { useCallback, useEffect, useMemo } from 'react'
import { defineMessages, useEditor, useToasts, useTranslation, useValue } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getEditorLibraries } from './editorLibraries'
import {
	getStarterPackBrowseGroup,
	getStarterPackSummaries,
	loadStarterPackSummaries,
} from './starterPacks'

const messages = defineMessages({
	publicLibraries: { defaultMessage: 'Public libraries' },
})

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

function useBrowseGroups(source: LibrarySource | null) {
	const msg = useTranslation()
	const trackEvent = useTldrawAppUiEvents()
	return useCallback(() => {
		const packs = getStarterPackSummaries()
		if (!source || !packs) return []
		return [getStarterPackBrowseGroup(source, packs, msg(messages.publicLibraries), trackEvent)]
	}, [source, msg, trackEvent])
}

export function TlaLibrariesPanel({ fileId }: { fileId: string }) {
	const editor = useEditor()
	const source = useEditorLibraries(fileId)
	const getBrowseGroups = useBrowseGroups(source)
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])

	// Fetched once the panel opens, so the packs are there when browsing.
	useEffect(() => {
		if (open && source) {
			loadStarterPackSummaries().catch((error) =>
				console.error("Couldn't load the starter packs", error)
			)
		}
	}, [open, source])

	if (!source) return null
	return <LibrariesPanel source={source} getBrowseGroups={getBrowseGroups} />
}

export function TlaAddToLibraryMenuItem({ fileId }: { fileId: string }) {
	const source = useEditorLibraries(fileId)
	if (!source) return null
	return <AddToLibraryMenuItem source={source} />
}

export function TlaLibrariesCommandPaletteGroup() {
	const source = useEditorLibraries(useCurrentFileId())
	const getBrowseGroups = useBrowseGroups(source)

	useEffect(() => {
		if (source) {
			loadStarterPackSummaries().catch((error) =>
				console.error("Couldn't load the starter packs", error)
			)
		}
	}, [source])

	if (!source) return null
	return <CommandPaletteLibrariesGroup source={source} getBrowseGroups={getBrowseGroups} />
}
