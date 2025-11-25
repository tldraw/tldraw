import { useCallback } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDefaultHelpers,
	useEditor,
	useValue,
} from 'tldraw'
import { useApp } from '../tla/hooks/useAppState'
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { $fairyAgentsAtom } from './fairy-agent/agent/fairyAgentsAtom'
import { fairyMessages } from './fairy-messages'
import { FairyDebugDialog } from './FairyDebugDialog'
import { $showCanvasFairyTasks, clearFairyTasks } from './FairyTaskList'

export function FairyTaskListMenuContent({
	agents,
	menuType = 'menu',
}: {
	agents: FairyAgent[]
	menuType?: 'menu' | 'context-menu'
}) {
	const editor = useEditor()
	const { addDialog } = useDefaultHelpers()
	const showCanvasTasks = useValue('show-canvas-tasks', () => $showCanvasFairyTasks.get(), [
		$showCanvasFairyTasks,
	])
	const showTasksOnCanvas = useMsg(fairyMessages.showTasksOnCanvas)
	const hideTasksOnCanvas = useMsg(fairyMessages.hideTasksOnCanvas)

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

	const disbandProjects = useCallback(() => {
		clearFairyTasks()
		for (const agent of $fairyAgentsAtom.get(editor)) {
			agent.interrupt({ mode: 'idling', input: null })
		}
	}, [editor])

	const summonAllFairiesLabel = useMsg(fairyMessages.summonAllFairies)
	const disbandProjectsLabel = useMsg(fairyMessages.disbandProjects)
	const resetAllChatsLabel = useMsg(fairyMessages.resetAllChats)
	const deleteAllFairiesLabel = useMsg(fairyMessages.deleteAllFairies)
	const debugViewLabel = useMsg(fairyMessages.debugView)

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="todo-menu">
				<TldrawUiMenuItem
					id="summon-all-fairies"
					onSelect={summonAllFairies}
					label={summonAllFairiesLabel}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="todo-list-config-menu">
				<TldrawUiMenuItem
					id="clear-todo-list"
					onSelect={() => disbandProjects()}
					label={disbandProjectsLabel}
				/>
				<TldrawUiMenuItem
					id="toggle-canvas-todos"
					onSelect={() => {
						$showCanvasFairyTasks.update((v) => !v)
					}}
					label={showCanvasTasks ? hideTasksOnCanvas : showTasksOnCanvas}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-management-menu">
				<TldrawUiMenuItem id="reset-chats" onSelect={resetAllChats} label={resetAllChatsLabel} />
				<TldrawUiMenuItem
					id="delete-fairies"
					onSelect={deleteAllFairies}
					label={deleteAllFairiesLabel}
				/>
				<TldrawUiMenuItem id="debug-fairies" onSelect={openDebugDialog} label={debugViewLabel} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
