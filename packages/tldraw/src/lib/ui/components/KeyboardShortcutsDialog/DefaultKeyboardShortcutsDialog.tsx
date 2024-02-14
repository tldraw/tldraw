import { DialogTitle } from '@radix-ui/react-dialog'
import { memo } from 'react'
import { TLUiDialogProps } from '../../context/dialogs'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../menus/TldrawUiMenuContext'
import { DialogBody, DialogCloseButton, DialogHeader } from '../primitives/Dialog'
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

	return (
		<>
			<DialogHeader className="tlui-shortcuts-dialog__header">
				<DialogTitle>{msg('shortcuts-title')}</DialogTitle>
				<DialogCloseButton />
			</DialogHeader>
			<DialogBody className="tlui-shortcuts-dialog__body">
				<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
					{content}
				</TldrawUiMenuContextProvider>
			</DialogBody>
			<div className="tlui-dialog__scrim" />
		</>
	)
})
