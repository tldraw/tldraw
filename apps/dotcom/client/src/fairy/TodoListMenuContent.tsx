import { useCallback } from 'react'
import { TldrawUiMenuContextProvider, TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'
import { clearSharedTodoList, requestHelpFromEveryone } from './SharedTodoList'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function TodoListMenuContent({
	agents,
	menuType = 'menu',
	onDeleteFairyConfig,
}: {
	agents: FairyAgent[]
	menuType?: 'menu' | 'context-menu'
	onDeleteFairyConfig(id: string): void
}) {
	const resetAllChats = useCallback(() => {
		agents.forEach((agent) => {
			agent.reset()
		})
	}, [agents])

	const resetAllWands = useCallback(() => {
		agents.forEach((agent) => {
			const config = agent.$fairyConfig.get()
			if (config) {
				agent.$fairyConfig.set({ ...config, wand: 'god' })
			}
		})
	}, [agents])

	const deleteAllFairies = useCallback(() => {
		agents.forEach((agent) => {
			onDeleteFairyConfig(agent.id)
		})
	}, [agents, onDeleteFairyConfig])

	const logFairies = useCallback(() => {
		agents.forEach((agent) => {
			// eslint-disable-next-line no-console
			console.log(agent.$fairyConfig.get())
			;(window as any).agents = agents
		})
	}, [agents])

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="todo-menu">
				<TldrawUiMenuItem
					id="ask-for-help-from-everyone"
					onSelect={() => requestHelpFromEveryone(agents)}
					label="Ask for help"
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="todo-list-config-menu">
				<TldrawUiMenuItem
					id="clear-todo-list"
					onSelect={() => clearSharedTodoList()}
					label="Clear todo list"
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-management-menu">
				<TldrawUiMenuItem id="reset-chats" onSelect={resetAllChats} label="Reset all chats" />
				<TldrawUiMenuItem id="reset-wands" onSelect={resetAllWands} label="Reset all wands" />
				<TldrawUiMenuItem
					id="delete-fairies"
					onSelect={deleteAllFairies}
					label="Delete all fairies"
				/>
				<TldrawUiMenuItem id="log-fairies" onSelect={logFairies} label="Log fairies" />
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
