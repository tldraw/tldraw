import { useCallback, useMemo } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useEditor,
	useValue,
} from 'tldraw'
import { useMsg } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { $fairyAgentsAtom, $fairyProjects } from '../../fairy-globals'
import { fairyMessages } from '../../fairy-messages'
import { disbandProject } from '../../fairy-projects'

export type FairyMenuSource = 'canvas' | 'sidebar' | 'chat'

export function FairyMenuContent({
	agents,
	menuType = 'menu',
	source = 'canvas',
}: {
	agents: FairyAgent[]
	menuType?: 'menu' | 'context-menu'
	source?: FairyMenuSource
}) {
	const editor = useEditor()
	const allAgents = useValue('fairy-agents', () => $fairyAgentsAtom.get(editor), [editor])

	const onlyAgent = agents.length === 1 ? agents[0] : null
	const hasSelected = agents.some((agent) => agent.$fairyEntity.get()?.isSelected)
	// const selectedAgents = useValue(
	// 	'selected-agents',
	// 	() => $fairyAgentsAtom.get(editor).filter((agent) => agent.$fairyEntity.get()?.isSelected),
	// 	[agents]
	// )

	const putAwayFairy = useCallback(() => {
		agents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false, pose: 'sleeping' } : f))
			agent.modeManager.setMode('sleeping')
		})
	}, [agents])

	const putAwayAllFairies = useCallback(() => {
		allAgents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false, pose: 'sleeping' } : f))
			agent.modeManager.setMode('sleeping')
		})
	}, [allAgents])

	const isFollowing = useValue(
		'is following fairy',
		() => {
			if (!onlyAgent) return false
			return onlyAgent.positionManager.getFollowingFairyId() === onlyAgent.id
		},
		[editor, onlyAgent]
	)

	const toggleFollow = useCallback(() => {
		if (!onlyAgent) return
		if (isFollowing) {
			onlyAgent.positionManager.stopFollowing()
		} else {
			onlyAgent.positionManager.startFollowing()
		}
	}, [onlyAgent, isFollowing])

	// const _configureFairy = useCallback(
	// 	(agent: FairyAgent) => {
	// 		addDialog({
	// 			component: ({ onClose }) => <FairyConfigDialog agent={agent} onClose={onClose} />,
	// 		})
	// 	},
	// 	[addDialog]
	// )

	// const _customizeFairyLabel = useMsg(fairyMessages.customizeFairy)

	const goToFairyLabel = useMsg(fairyMessages.goToFairy)
	const summonFairyLabel = useMsg(fairyMessages.summonFairy)
	const wakeFairyLabel = useMsg(fairyMessages.wakeFairy)
	const summonAllFairiesLabel = useMsg(fairyMessages.summonAllFairies)
	const followFairyLabel = useMsg(fairyMessages.followFairy)
	const unfollowFairyLabel = useMsg(fairyMessages.unfollowFairy)
	const resetChatLabel = useMsg(fairyMessages.resetChat)
	const resetAllChatsLabel = useMsg(fairyMessages.resetAllChats)
	const putAwayFairyLabel = useMsg(fairyMessages.putAwayFairy)
	const putAwayAllFairiesLabel = useMsg(fairyMessages.putAwayAllFairies)
	const disbandGroupLabel = useMsg(fairyMessages.disbandGroup)
	const fairyManagementLabel = useMsg(fairyMessages.fairyManagement)
	const selectAllFairiesLabel = useMsg(fairyMessages.selectAllFairiesLabel)
	const deselectFairyLabel = useMsg(fairyMessages.deselectFairy)
	const closeChatPanelLabel = useMsg(fairyMessages.closeChatPanel)
	const selectFairyLabel = useMsg(fairyMessages.selectFairy)

	const projects = useValue($fairyProjects)
	const currentProject = useMemo(() => {
		if (!onlyAgent) return null
		return (
			projects.find((project) => project.members.some((member) => member.id === onlyAgent.id)) ??
			null
		)
	}, [projects, onlyAgent])
	const canDisbandGroup = currentProject && currentProject.members.length > 1

	const disbandGroup = useCallback(() => {
		if (!currentProject) return

		disbandProject(currentProject.id, editor)
	}, [currentProject, editor])

	const summonAllFairies = useCallback(() => {
		const spacing = 150 // Distance between fairies
		allAgents.forEach((agent, index) => {
			if (allAgents.length === 1) {
				agent.positionManager.summon()
			} else {
				// Arrange fairies in a circle around the center
				const angleStep = (2 * Math.PI) / allAgents.length
				const angle = index * angleStep
				const offset = {
					x: Math.cos(angle) * spacing,
					y: Math.sin(angle) * spacing,
				}
				agent.positionManager.summon(offset)
			}
		})
	}, [allAgents])

	const hasChatHistory = useValue(
		'has-chat-history',
		() => {
			return agents.some((agent) => agent.chatManager.getHistory().length > 0)
		},
		[agents]
	)

	const resetAllChats = useCallback(() => {
		allAgents.forEach((agent) => {
			if (agent.modeManager.isSleeping()) return
			agent.reset()
		})
	}, [allAgents])

	const deselect = useCallback(() => {
		agents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
		})
	}, [agents])

	const select = useCallback(() => {
		agents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))
		})
	}, [agents])

	const selectAllFairies = useCallback(() => {
		allAgents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))
		})
	}, [allAgents])

	if (canDisbandGroup && currentProject) {
		return (
			<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
				<TldrawUiMenuGroup id="fairy-group-menu">
					<TldrawUiMenuItem id="disband-group" onSelect={disbandGroup} label={disbandGroupLabel} />
				</TldrawUiMenuGroup>
			</TldrawUiMenuContextProvider>
		)
	}

	if (onlyAgent && onlyAgent.modeManager.isSleeping()) {
		return (
			<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
				<TldrawUiMenuGroup id="fairy-sleep-menu">
					<TldrawUiMenuItem
						id="wake-fairy"
						onSelect={() => onlyAgent.modeManager.setMode('idling')}
						label={wakeFairyLabel}
					/>
				</TldrawUiMenuGroup>
			</TldrawUiMenuContextProvider>
		)
	}

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="single-fairy-menu">
				{!agents.some((agent) => agent.$fairyEntity.get().isSelected) && (
					<TldrawUiMenuItem id="select" onSelect={select} label={selectFairyLabel} />
				)}
				{source !== 'canvas' && (
					<>
						{onlyAgent && (
							<TldrawUiMenuItem
								id="go-to-fairy"
								onSelect={() => onlyAgent.positionManager.zoomTo()}
								label={goToFairyLabel}
							/>
						)}
						<TldrawUiMenuItem
							id="summon-fairy"
							onSelect={() => agents.forEach((agent) => agent.positionManager.summon())}
							label={summonFairyLabel}
						/>
					</>
				)}
				{onlyAgent && (
					<TldrawUiMenuItem
						id="follow-fairy"
						onSelect={toggleFollow}
						label={isFollowing ? unfollowFairyLabel : followFairyLabel}
					/>
				)}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-management-menu">
				<TldrawUiMenuSubmenu id="fairy-management-submenu" label={fairyManagementLabel}>
					<TldrawUiMenuGroup id="fairy-management-group">
						<TldrawUiMenuItem
							id="select all fairies"
							onSelect={selectAllFairies}
							label={selectAllFairiesLabel}
						/>
						<TldrawUiMenuItem
							id="summon-all-fairies"
							onSelect={summonAllFairies}
							label={summonAllFairiesLabel}
						/>
						<TldrawUiMenuItem
							id="put-away-fairy"
							onSelect={putAwayFairy}
							label={putAwayFairyLabel}
						/>
						<TldrawUiMenuItem
							id="put-away-all-fairies"
							onSelect={putAwayAllFairies}
							label={putAwayAllFairiesLabel}
						/>
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="fairy-chat-menu">
						{hasChatHistory && (
							<TldrawUiMenuItem
								id="reset-fairy-chat"
								onSelect={() => allAgents.forEach((agent) => agent.reset())}
								label={resetChatLabel}
							/>
						)}
						<TldrawUiMenuItem
							id="reset-all-chats"
							onSelect={resetAllChats}
							label={resetAllChatsLabel}
						/>
					</TldrawUiMenuGroup>
				</TldrawUiMenuSubmenu>
			</TldrawUiMenuGroup>
			{hasSelected && (
				<TldrawUiMenuGroup id="fairy-close-menu">
					<TldrawUiMenuItem
						id="deselect"
						onSelect={deselect}
						label={source === 'chat' ? closeChatPanelLabel : deselectFairyLabel}
					/>
				</TldrawUiMenuGroup>
			)}
		</TldrawUiMenuContextProvider>
	)
}
