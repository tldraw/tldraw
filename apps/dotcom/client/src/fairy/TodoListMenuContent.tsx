import { useCallback } from 'react'
import { TldrawUiMenuContextProvider, TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'
import { useApp } from '../tla/hooks/useAppState'
import { clearSharedTodoList } from './SharedTodoList'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function TodoListMenuContent({
	agents,
	menuType = 'menu',
}: {
	agents: FairyAgent[]
	menuType?: 'menu' | 'context-menu'
}) {
	const resetAllChats = useCallback(() => {
		agents.forEach((agent) => {
			agent.reset()
		})
	}, [agents])

	const app = useApp()
	const deleteAllFairies = useCallback(() => {
		app.z.mutate.user.deleteAllFairyConfigs()
		agents.forEach((agent) => {
			agent.dispose()
		})
	}, [app, agents])

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="todo-menu"></TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="todo-list-config-menu">
				<TldrawUiMenuItem
					id="clear-todo-list"
					onSelect={() => clearSharedTodoList()}
					label="Clear todo list"
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-management-menu">
				<TldrawUiMenuItem id="reset-chats" onSelect={resetAllChats} label="Reset all chats" />
				<TldrawUiMenuItem
					id="delete-fairies"
					onSelect={deleteAllFairies}
					label="Delete all fairies"
				/>
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
