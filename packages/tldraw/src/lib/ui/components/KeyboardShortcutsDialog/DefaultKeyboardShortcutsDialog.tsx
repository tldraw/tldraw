import { defineMessages, useEditor, useValue } from '@tldraw/editor'
import classNames from 'classnames'
import { ReactNode, memo } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { TLUiDialogProps } from '../../context/dialogs'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from '../primitives/TldrawUiDialog'
import { DefaultKeyboardShortcutsDialogContent } from './DefaultKeyboardShortcutsDialogContent'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	shortcutsDialogDisabledNotice: {
		id: 'shortcuts-dialog.disabled-notice',
		defaultMessage:
			'Keyboard shortcuts are turned off. Turn them back on under Preferences > Accessibility.',
	},
	shortcutsDialogTitle: { id: 'shortcuts-dialog.title', defaultMessage: 'Keyboard shortcuts' },
})

/** @public */
export type TLUiKeyboardShortcutsDialogProps = TLUiDialogProps & {
	children?: ReactNode
}

/** @public @react */
export const DefaultKeyboardShortcutsDialog = memo(function DefaultKeyboardShortcutsDialog({
	children,
}: TLUiKeyboardShortcutsDialogProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()
	const areKeyboardShortcutsEnabled = useValue(
		'areKeyboardShortcutsEnabled',
		() => editor.user.getAreKeyboardShortcutsEnabled(),
		[editor]
	)

	const content = children ?? <DefaultKeyboardShortcutsDialogContent />

	return (
		<>
			<TldrawUiDialogHeader className="tlui-shortcuts-dialog__header">
				<TldrawUiDialogTitle>{msg(messages.shortcutsDialogTitle.id)}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			{!areKeyboardShortcutsEnabled && (
				<div
					className="tlui-shortcuts-dialog__disabled-notice"
					data-testid="kbd.disabled-notice"
					role="status"
				>
					{msg(messages.shortcutsDialogDisabledNotice.id)}
				</div>
			)}
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
