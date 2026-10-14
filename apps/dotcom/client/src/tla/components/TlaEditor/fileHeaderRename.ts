import { useCallback } from 'react'
import { atom, useMaybeEditor } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { getIsCoarsePointer } from '../../utils/getIsCoarsePointer'
import { useIntl } from '../../utils/i18n'
import { sidebarMessages } from '../TlaSidebar/components/TlaSidebarFileLink'

// The id of the file whose header name is being edited, so a rename can't carry over to another file.
export const fileHeaderRenaming = atom<string | null>('file header renaming', null)

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
		fileHeaderRenaming.set(fileId ?? null)
	}, [app, editor, fileId, fileName, intl])
}
