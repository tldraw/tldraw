import { TLComponents } from 'tldraw'
import { TlaCommandPalette } from '../TlaCommandPalette/TlaCommandPalette'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { TlaEditorMenuPanel } from './editor-components/TlaEditorMenuPanel'
import { TlaEditorSharePanel } from './editor-components/TlaEditorSharePanel'
import { TlaEditorTopPanel } from './editor-components/TlaEditorTopPanel'

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	CommandPalette: TlaCommandPalette,
	MenuPanel: TlaEditorMenuPanel,
	TopPanel: TlaEditorTopPanel,
	SharePanel: TlaEditorSharePanel,
	Dialogs: null,
	Toasts: null,
	// No loading screen on tla editors: the editor only mounts once it's ready,
	// so a spinner would only flash before the content appears.
	LoadingScreen: null,
}
