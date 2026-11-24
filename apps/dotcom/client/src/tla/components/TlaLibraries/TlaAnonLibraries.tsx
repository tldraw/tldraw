import { LibrariesPanel, librariesPanelOpen, useLibrariesEnabled } from '@tldraw/libraries'
import { useEffect, useMemo, type ReactNode } from 'react'
import {
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDialogs,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { TlaSignInDialog } from '../dialogs/TlaSignInDialog'
import { getAnonEditorLibraries } from './anonEditorLibraries'
import { AnonLibrariesContext, useAnonLibrariesOffered } from './useAnonLibrariesOffered'

/** Marks the editor inside it as one that mounts {@link TlaAnonLibrariesPanel}. */
export function TlaAnonLibrariesProvider({ children }: { children: ReactNode }) {
	return <AnonLibrariesContext.Provider value={true}>{children}</AnonLibrariesContext.Provider>
}

export function TlaAnonLibrariesPanel() {
	const offered = useAnonLibrariesOffered()
	return offered ? <AnonLibrariesPanel /> : null
}

function AnonLibrariesPanel() {
	const editor = useEditor()
	const msg = useTranslation()
	const { source, starterPacks } = useMemo(() => getAnonEditorLibraries(editor, msg), [editor, msg])

	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])

	useEffect(() => {
		if (open) starterPacks.load()
	}, [open, starterPacks])

	return <LibrariesPanel source={source} components={{ NoLibraries: null }} />
}

/**
 * "Add to library" for a signed-out visitor, which opens the sign-in dialog: saving needs an
 * account.
 */
export function TlaAnonAddToLibraryMenuItem() {
	const editor = useEditor()
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const offered = useAnonLibrariesOffered()
	const librariesEnabled = useLibrariesEnabled()
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])

	if (!offered || !librariesEnabled || !hasSelection) return null

	return (
		<TldrawUiMenuGroup id="libraries">
			<TldrawUiMenuItem
				id="add-to-library"
				label="libraries.add-to-library"
				onSelect={() => {
					trackEvent('sign-up-clicked', {
						source: 'libraries',
						ctaMessage: msg('libraries.add-to-library'),
					})
					addDialog({ component: TlaSignInDialog })
				}}
			/>
		</TldrawUiMenuGroup>
	)
}
