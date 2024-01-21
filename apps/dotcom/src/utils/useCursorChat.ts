import { TLUiOverrides, menuGroup, menuItem } from '@tldraw/tldraw'
import { useMemo } from 'react'
import { useHandleUiEvents } from './useHandleUiEvent'

export const CURSOR_CHAT_ACTION = 'open-cursor-chat' as const

export function useCursorChat(): TLUiOverrides {
	const handleUiEvent = useHandleUiEvents()
	return useMemo(
		(): TLUiOverrides => ({
			actions(editor, actions) {
				actions[CURSOR_CHAT_ACTION] = {
					id: 'open-cursor-chat',
					label: 'action.open-cursor-chat',
					readonlyOk: true,
					kbd: '/',
					onSelect(source: any) {
						handleUiEvent('open-cursor-chat', { source })

						// Don't open cursor chat if we're on a touch device
						if (editor.getInstanceState().isCoarsePointer) {
							return
						}

						editor.updateInstanceState({ isChatting: true })
					},
				}
				return actions
			},
			contextMenu(editor, contextMenu, { actions }) {
				if (editor.getSelectedShapes().length > 0 || editor.getInstanceState().isCoarsePointer) {
					return contextMenu
				}

				const cursorChatGroup = menuGroup('cursor-chat', menuItem(actions[CURSOR_CHAT_ACTION]))
				if (!cursorChatGroup) {
					return contextMenu
				}

				const clipboardGroupIndex = contextMenu.findIndex((group) => group.id === 'clipboard-group')
				if (clipboardGroupIndex === -1) {
					contextMenu.push(cursorChatGroup)
					return contextMenu
				}

				contextMenu.splice(clipboardGroupIndex + 1, 0, cursorChatGroup)
				return contextMenu
			},
			keyboardShortcutsMenu(editor, keyboardShortcutsMenu, { actions }) {
				const group = menuGroup(
					'shortcuts-dialog.collaboration',
					menuItem(actions[CURSOR_CHAT_ACTION])
				)
				if (!group) {
					return keyboardShortcutsMenu
				}
				keyboardShortcutsMenu.push(group)
				return keyboardShortcutsMenu
			},
		}),
		[handleUiEvent]
	)
}
