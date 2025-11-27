import { useCallback } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDefaultHelpers,
} from 'tldraw'
import { useTldrawAppUiEvents } from '../tla/utils/app-ui-events'
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { FairyDebugDialog } from './FairyDebugDialog'

export function FairyTaskListMenuContent({
	agents,
	menuType = 'menu',
}: {
	agents: FairyAgent[]
	menuType?: 'menu' | 'context-menu'
}) {
	const { addDialog } = useDefaultHelpers()
	const trackEvent = useTldrawAppUiEvents()

	const resetSelectedChats = useCallback(() => {
		const selectedAgents = agents.filter((agent) => agent.$fairyEntity.get()?.isSelected)
		if (selectedAgents.length === 0) return

		selectedAgents.forEach((agent) => {
			agent.reset()
		})
	}, [agents])

	const openDebugDialog = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <FairyDebugDialog agents={agents} onClose={onClose} />,
		})
	}, [addDialog, agents])

	const summonSelectedFairies = useCallback(() => {
		const selectedAgents = agents.filter((agent) => agent.$fairyEntity.get()?.isSelected)
		if (selectedAgents.length === 0) return

		trackEvent('fairy-summon-selected', { source: 'fairy-panel', feat: 'fairy' })

		const spacing = 150 // Distance between fairies
		selectedAgents.forEach((agent, index) => {
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
	}, [agents, trackEvent])

	const putAwayFairies = useCallback(() => {
		const selectedAgents = agents.filter((agent) => agent.$fairyEntity.get()?.isSelected)
		if (selectedAgents.length === 0) return

		trackEvent('fairy-put-away-selected', { source: 'fairy-panel', feat: 'fairy' })

		selectedAgents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false, pose: 'sleeping' } : f))
			agent.setMode('sleeping')
		})
	}, [agents, trackEvent])

	const summonFairiesLabel = useMsg(fairyMessages.summonFairies)
	const putAwayFairiesLabel = useMsg(fairyMessages.putAwayFairies)

	const resetChatsLabel = useMsg(fairyMessages.resetChats)
	const debugViewLabel = useMsg(fairyMessages.debugView)

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="todo-menu">
				<TldrawUiMenuItem
					id="summon--fairies"
					onSelect={summonSelectedFairies}
					label={summonFairiesLabel}
				/>
				<TldrawUiMenuItem
					id="put-away-fairies"
					onSelect={putAwayFairies}
					label={putAwayFairiesLabel}
				/>
			</TldrawUiMenuGroup>
			{/* <TldrawUiMenuGroup id="todo-list-config-menu">
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
			</TldrawUiMenuGroup> */}
			<TldrawUiMenuGroup id="fairy-management-menu">
				<TldrawUiMenuItem id="reset-chats" onSelect={resetSelectedChats} label={resetChatsLabel} />
				<TldrawUiMenuItem id="debug-fairies" onSelect={openDebugDialog} label={debugViewLabel} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
