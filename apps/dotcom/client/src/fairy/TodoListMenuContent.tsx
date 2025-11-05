import { useCallback } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDefaultHelpers,
} from 'tldraw'
import { useApp } from '../tla/hooks/useAppState'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyDebugDialog } from './FairyDebugDialog'
import { clearSharedTodoList, requestHelpFromEveryone } from './SharedTodoList'

export function TodoListMenuContent({
	agents,
	menuType = 'menu',
}: {
	agents: FairyAgent[]
	menuType?: 'menu' | 'context-menu'
}) {
	const { addDialog } = useDefaultHelpers()

	const resetAllChats = useCallback(() => {
		agents.forEach((agent) => {
			agent.reset()
		})
	}, [agents])

	const resetAllWands = useCallback(() => {
		agents.forEach((agent) => {
			agent.updateFairyConfig({ wand: 'default' })
		})
	}, [agents])

	const app = useApp()
	const deleteAllFairies = useCallback(() => {
		app.z.mutate.user.deleteAllFairyConfigs()
		agents.forEach((agent) => {
			agent.dispose()
		})
	}, [app, agents])

	const openDebugDialog = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <FairyDebugDialog agents={agents} onClose={onClose} />,
		})
	}, [addDialog, agents])

	const summonAllFairies = useCallback(() => {
		const spacing = 150 // Distance between fairies
		agents.forEach((agent, index) => {
			if (agents.length === 1) {
				agent.summon()
			} else {
				// Arrange fairies in a circle around the center
				const angleStep = (2 * Math.PI) / agents.length
				const angle = index * angleStep
				const offset = {
					x: Math.cos(angle) * spacing,
					y: Math.sin(angle) * spacing,
				}
				agent.summon(offset)
			}
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
				<TldrawUiMenuItem
					id="summon-all-fairies"
					onSelect={summonAllFairies}
					label="Summon all fairies"
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
				<TldrawUiMenuItem id="debug-fairies" onSelect={openDebugDialog} label="Debug view" />
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
