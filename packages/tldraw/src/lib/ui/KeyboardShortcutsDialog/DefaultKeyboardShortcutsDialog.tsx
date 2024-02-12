import { memo } from 'react'
import { TldrawUiMenuContextProvider } from '../components/menus/TldrawUiMenuContext'
import * as Dialog from '../components/primitives/Dialog'
import { useTldrawUiComponents } from '../hooks/useTldrawUiComponents'
import { useTranslation } from '../hooks/useTranslation/useTranslation'

/** @public */
export const DefaultKeyboardShortcutsDialog = memo(function DefaultKeyboardShortcutsDialog() {
	const msg = useTranslation()

	const { KeyboardShortcutsDialogContent } = useTldrawUiComponents()
	if (!KeyboardShortcutsDialogContent) return null

	return (
		<>
			<Dialog.Header className="tlui-shortcuts-dialog__header">
				<Dialog.Title>{msg('shortcuts-dialog.title')}</Dialog.Title>
				<Dialog.CloseButton />
			</Dialog.Header>
			<Dialog.Body className="tlui-shortcuts-dialog__body">
				<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
					<KeyboardShortcutsDialogContent />
				</TldrawUiMenuContextProvider>
			</Dialog.Body>
			<div className="tlui-dialog__scrim" />
		</>
	)
})
