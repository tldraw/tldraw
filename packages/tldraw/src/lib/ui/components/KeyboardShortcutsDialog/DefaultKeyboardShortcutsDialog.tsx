import classNames from 'classnames'
import { ReactNode, memo } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { TLUiDialogProps } from '../../context/dialogs'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from '../primitives/TldrawUiDialog'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultKeyboardShortcutsDialogContent } from './DefaultKeyboardShortcutsDialogContent'

/** @public */
export type TLUiKeyboardShortcutsDialogProps = TLUiDialogProps & {
	children?: ReactNode
}

/** @public @react */
export const DefaultKeyboardShortcutsDialog = memo(function DefaultKeyboardShortcutsDialog({
	children,
}: TLUiKeyboardShortcutsDialogProps) {
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	const content = children ?? <DefaultKeyboardShortcutsDialogContent />

	return (
		<>
			<TldrawUiDialogHeader className="tlui-shortcuts-dialog__header">
				<TldrawUiDialogTitle>{msg('shortcuts-dialog.title')}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody
				className={classNames('tlui-shortcuts-dialog__body', {
					'tlui-shortcuts-dialog__body__mobile': breakpoint <= PORTRAIT_BREAKPOINT.MOBILE_XS,
					'tlui-shortcuts-dialog__body__tablet': breakpoint <= PORTRAIT_BREAKPOINT.TABLET,
				})}
			>
				<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
					{content}
				</TldrawUiMenuContextProvider>
			</TldrawUiDialogBody>
			<div className="tlui-dialog__scrim" />
		</>
	)
})
