import { useCallback, useMemo } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useEditor,
	useValue,
} from 'tldraw'
import { useTldrawAppUiEvents } from '../../../tla/utils/app-ui-events'
import { useMsg } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { fairyMessages } from '../../fairy-messages'

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
	const fairyApp = useFairyApp()
	const trackEvent = useTldrawAppUiEvents()
	const allAgents = useValue('fairy-agents', () => fairyApp.agents.getAgents(), [fairyApp])

	const selectedAgents = useValue(
		'selected-fairies',
		() => agents.filter((agent) => agent.getEntity()?.isSelected),
		[fairyApp]
	)

	const onlyAgent = agents.length === 1 ? agents[0] : null
	const hasSelected = agents.some((agent) => agent.getEntity()?.isSelected)

	// Check if any currently selected fairy is in a project (used to prevent mixed selection)
	const hasSelectedProjectFairy = useValue(
		'has-selected-project-fairy',
		() =>
			allAgents.some((agent) => {
				if (!agent.getEntity()?.isSelected) return false
				const project = agent.getProject()
				return project && project.members.length > 1
			}),
		[allAgents]
	)

	const putAwayFairy = useCallback(() => {
		agents.forEach((agent: FairyAgent) => {
			trackEvent('fairy-sleep', { source: 'fairy-panel', fairyId: agent.id })
			// Cancel any active generation before putting the fairy away
			agent.cancel()
			agent.updateEntity((f) => (f ? { ...f, isSelected: false, pose: 'sleeping' } : f))
			agent.mode.setMode('sleeping')
		})
	}, [agents, trackEvent])

	const putAwayAllFairies = useCallback(() => {
		trackEvent('fairy-sleep-all', { source: 'fairy-panel' })
		allAgents.forEach((agent: FairyAgent) => {
			// Cancel any active generation before putting the fairy away
			agent.cancel()
			agent.updateEntity((f) => (f ? { ...f, isSelected: false, pose: 'sleeping' } : f))
			agent.mode.setMode('sleeping')
		})
	}, [allAgents, trackEvent])

	const isFollowing = useValue(
		'is following fairy',
		() => {
			if (!onlyAgent) return false
			return onlyAgent.position.getFollowingFairyId() === onlyAgent.id
		},
		[editor, onlyAgent]
	)

	const toggleFollow = useCallback(() => {
		if (!onlyAgent) return
		if (isFollowing) {
			trackEvent('fairy-unfollow', { source: 'fairy-panel', fairyId: onlyAgent.id })
			onlyAgent.position.stopFollowing()
		} else {
			trackEvent('fairy-follow', { source: 'fairy-panel', fairyId: onlyAgent.id })
			onlyAgent.position.startFollowing()
		}
	}, [onlyAgent, isFollowing, trackEvent])

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

	const projects = useValue(
		'fairy-projects',
		() => (fairyApp ? fairyApp.projects.getProjects() : []),
		[fairyApp]
	)
	const currentProject = useMemo(() => {
		if (!onlyAgent) return null
		return (
			projects.find((project: any) =>
				project.members.some((member: any) => member.id === onlyAgent.id)
			) ?? null
		)
	}, [projects, onlyAgent])
	const canDisbandGroup = currentProject && currentProject.members.length > 1

	const disbandGroup = useCallback(() => {
		if (!currentProject || !fairyApp) return

		trackEvent('fairy-disband-group', { source: 'fairy-panel', projectId: currentProject.id })
		fairyApp.projects.disbandProject(currentProject.id)
	}, [currentProject, fairyApp, trackEvent])

	const summonAllFairies = useCallback(() => {
		trackEvent('fairy-summon-all', { source: 'fairy-panel' })
		const spacing = 150 // Distance between fairies
		allAgents.forEach((agent: FairyAgent, index: number) => {
			if (allAgents.length === 1) {
				agent.position.summon()
			} else {
				// Arrange fairies in a circle around the center
				const angleStep = (2 * Math.PI) / allAgents.length
				const angle = index * angleStep
				const offset = {
					x: Math.cos(angle) * spacing,
					y: Math.sin(angle) * spacing,
				}
				agent.position.summon(offset)
			}
		})
	}, [allAgents, trackEvent])

	const hasChatHistory = useValue(
		'has-chat-history',
		() => {
			return agents.some((agent) => agent.chat.getHistory().length > 0)
		},
		[agents]
	)

	const resetAllChats = useCallback(() => {
		trackEvent('fairy-reset-all-chats', { source: 'fairy-panel' })
		allAgents.forEach((agent: FairyAgent) => {
			if (agent.mode.isSleeping()) return
			agent.reset()
		})
	}, [allAgents, trackEvent])

	const deselect = useCallback(() => {
		agents.forEach((agent: FairyAgent) => {
			trackEvent('fairy-deselect', { source: 'fairy-panel', fairyId: agent.id })
			agent.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
		})
	}, [agents, trackEvent])

	const select = useCallback(() => {
		agents.forEach((agent: FairyAgent) => {
			trackEvent('fairy-select', { source: 'fairy-panel', fairyId: agent.id })
			agent.updateEntity((f) => (f ? { ...f, isSelected: true } : f))
		})
	}, [agents, trackEvent])

	const selectAllFairies = useCallback(() => {
		trackEvent('fairy-select-all', { source: 'fairy-panel' })
		allAgents
			.filter((agent) => !agent.getProject())
			.forEach((agent: FairyAgent) => {
				agent.updateEntity((f) => (f ? { ...f, isSelected: true } : f))
			})
	}, [allAgents, trackEvent])

	if (canDisbandGroup && currentProject) {
		return (
			<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
				<TldrawUiMenuGroup id="fairy-group-menu">
					<TldrawUiMenuItem id="disband-group" onSelect={disbandGroup} label={disbandGroupLabel} />
				</TldrawUiMenuGroup>
			</TldrawUiMenuContextProvider>
		)
	}

	if (onlyAgent && onlyAgent.mode.isSleeping()) {
		return (
			<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
				<TldrawUiMenuGroup id="fairy-sleep-menu">
					<TldrawUiMenuItem
						id="wake-fairy"
						onSelect={() => {
							trackEvent('fairy-wake', { source: 'fairy-panel', fairyId: onlyAgent.id })
							onlyAgent.mode.setMode('idling')
						}}
						label={wakeFairyLabel}
					/>
				</TldrawUiMenuGroup>
			</TldrawUiMenuContextProvider>
		)
	}

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="single-fairy-menu">
				{!agents.some((agent) => agent.getEntity().isSelected) && !hasSelectedProjectFairy && (
					<TldrawUiMenuItem id="select" onSelect={select} label={selectFairyLabel} />
				)}
				{source !== 'canvas' && (
					<>
						{onlyAgent && (
							<TldrawUiMenuItem
								id="go-to-fairy"
								onSelect={() => {
									trackEvent('fairy-zoom-to', { source: 'fairy-panel', fairyId: onlyAgent.id })
									onlyAgent.position.zoomTo()
								}}
								label={goToFairyLabel}
							/>
						)}
						<TldrawUiMenuItem
							id="summon-fairy"
							onSelect={() => {
								selectedAgents.forEach((agent: FairyAgent) => {
									trackEvent('fairy-summon', { source: 'fairy-panel', fairyId: agent.id })
									agent.position.summon()
								})
							}}
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
						{!hasSelectedProjectFairy && (
							<TldrawUiMenuItem
								id="select all fairies"
								onSelect={selectAllFairies}
								label={selectAllFairiesLabel}
							/>
						)}
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
								onSelect={() => {
									agents.forEach((agent: FairyAgent) => {
										trackEvent('fairy-reset-chat', { source: 'fairy-panel', fairyId: agent.id })
										agent.reset()
									})
								}}
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
