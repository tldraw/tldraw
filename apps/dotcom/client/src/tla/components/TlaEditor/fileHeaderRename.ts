import { useCallback } from 'react'
import { atom, useMaybeEditor } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { getIsCoarsePointer } from '../../utils/getIsCoarsePointer'
import { useIntl } from '../../utils/i18n'
import { sidebarMessages } from '../TlaSidebar/components/TlaSidebarFileLink'

export const fileHeaderRenaming = atom('file header renaming', false)

export function useStartFileRename(fileId: string | undefined, fileName: string) {
	const app = useApp()
	const intl = useIntl()
	const editor = useMaybeEditor()
	return useCallback(() => {
		if (getIsCoarsePointer()) {
			const newName = prompt(intl.formatMessage(sidebarMessages.renameFile), fileName)?.trim()
			if (newName && fileId) app.updateFile(fileId, { name: newName })
			return
		}
		// The header isn't rendered in focus mode.
		editor?.updateInstanceState({ isFocusMode: false })
		fileHeaderRenaming.set(true)
	}, [app, editor, fileId, fileName, intl])
}
