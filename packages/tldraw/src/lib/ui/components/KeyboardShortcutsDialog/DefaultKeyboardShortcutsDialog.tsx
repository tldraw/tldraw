import { memo } from 'react'
import { TLUiDialogProps } from '../../hooks/useDialogsProvider'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../menus/TldrawUiMenuContext'
import * as Dialog from '../primitives/Dialog'
import { DefaultKeyboardShortcutsDialogContent } from './DefaultKeyboardShortcutsDialogContent'

/** @public */
export type TLUiKeyboardShortcutsDialogProps = TLUiDialogProps & {
	children?: any
}

/** @public */
export const DefaultKeyboardShortcutsDialog = memo(function DefaultKeyboardShortcutsDialog({
	children,
}: TLUiKeyboardShortcutsDialogProps) {
	const msg = useTranslation()

	const content = children ?? <DefaultKeyboardShortcutsDialogContent />
	if (!content) return null

	return (
		<>
			<Dialog.Header className="tlui-shortcuts-dialog__header">
				<Dialog.Title>{msg('shortcuts-dialog.title')}</Dialog.Title>
				<Dialog.CloseButton />
			</Dialog.Header>
			<Dialog.Body className="tlui-shortcuts-dialog__body">
				<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
					{content}
				</TldrawUiMenuContextProvider>
			</Dialog.Body>
			<div className="tlui-dialog__scrim" />
		</>
	)
})
