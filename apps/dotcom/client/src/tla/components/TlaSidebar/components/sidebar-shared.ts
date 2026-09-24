import { useValue } from 'tldraw'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import { defineMessages } from '../../../utils/i18n'

export interface RecentFile {
	fileId: string
	date: number
	isPinned: boolean
}

export const messages = defineMessages({
	create: { defaultMessage: 'Create file' },
	toggleSidebar: { defaultMessage: 'Toggle sidebar' },
	accountMenu: { defaultMessage: 'Account menu' },
	fileMenu: { defaultMessage: 'File menu' },
})

/** The sidebar toggles hide until an editor exists, and while it is in focus mode. */
export function useHideSidebarToggle() {
	const editor = useGlobalEditor()
	return useValue('hideSidebarToggle', () => !editor || editor.getInstanceState().isFocusMode, [
		editor,
	])
}
