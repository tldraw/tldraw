import { useCallback } from 'react'
import { TldrawUiMenuContextProvider, TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'
import { clearSharedTodoList } from './SharedTodoList'

export function TodoListMenuContent({
	onRequestHelpFromEveryone,
	menuType = 'menu',
}: {
	onRequestHelpFromEveryone(): void
	menuType?: 'menu' | 'context-menu'
}) {
	const requestHelpFromEveryone = useCallback(() => {
		onRequestHelpFromEveryone()
	}, [onRequestHelpFromEveryone])

	const clearList = useCallback(() => {
		clearSharedTodoList()
	}, [])

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="todo-menu">
				<TldrawUiMenuItem
					id="ask-for-help-from-everyone"
					onSelect={requestHelpFromEveryone}
					label="Ask for help"
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="todo-list-config-menu">
				<TldrawUiMenuItem id="clear-todo-list" onSelect={clearList} label="Clear list" />
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
