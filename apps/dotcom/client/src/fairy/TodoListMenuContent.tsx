import { useCallback } from 'react'
import { TldrawUiMenuContextProvider, TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { clearSharedTodoList } from './SharedTodoList'

export function TodoListMenuContent({
	onRequestHelpFromEveryone,
	agents,
	onDeleteFairyConfig,
	menuType = 'menu',
}: {
	onRequestHelpFromEveryone(): void
	agents: FairyAgent[]
	onDeleteFairyConfig(id: string): void
	menuType?: 'menu' | 'context-menu'
}) {
	const requestHelpFromEveryone = useCallback(() => {
		onRequestHelpFromEveryone()
	}, [onRequestHelpFromEveryone])

	const clearList = useCallback(() => {
		clearSharedTodoList()
	}, [])

	const resetFairies = useCallback(() => {
		agents.forEach((agent) => {
			agent.reset()
			const config = agent.$fairyConfig.get()
			if (config) {
				agent.$fairyConfig.set({ ...config, wand: 'god' })
			}
		})
	}, [agents])

	const deleteFairies = useCallback(() => {
		agents.forEach((agent) => {
			onDeleteFairyConfig(agent.id)
		})
	}, [agents, onDeleteFairyConfig])

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
			<TldrawUiMenuGroup id="fairy-management-menu">
				<TldrawUiMenuItem id="reset-fairies" onSelect={resetFairies} label="Reset fairies" />
				<TldrawUiMenuItem id="delete-fairies" onSelect={deleteFairies} label="Delete fairies" />
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
