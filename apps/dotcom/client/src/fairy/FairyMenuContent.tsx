import { useCallback, useMemo } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useDefaultHelpers,
	useEditor,
	useValue,
} from 'tldraw'
import { useApp } from '../tla/hooks/useAppState'
import { useMsg } from '../tla/utils/i18n'
import { isDevelopmentEnv } from '../utils/env'
import { FairyAgent, getFollowingFairyId } from './fairy-agent/agent/FairyAgent'
import { $fairyAgentsAtom } from './fairy-agent/agent/fairyAgentsAtom'
import { fairyMessages } from './fairy-messages'
import { FairyDebugDialog } from './FairyDebugDialog'
import { $fairyProjects, disbandProject } from './FairyProjects'
import { clearFairyTasksAndProjects } from './FairyTaskList'

export function FairyMenuContent({
	agent,
	menuType = 'menu',
}: {
	agent: FairyAgent
	menuType?: 'menu' | 'context-menu'
}) {
	const editor = useEditor()
	const app = useApp()
	const { addDialog } = useDefaultHelpers()
	const agents = useValue('fairy-agents', () => $fairyAgentsAtom.get(editor), [editor])

	const putAwayFairy = useCallback(() => {
		agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false, pose: 'sleeping' } : f))
		agent.setMode('sleeping')
	}, [agent])

	const putAwayAllFairies = useCallback(() => {
		agents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false, pose: 'sleeping' } : f))
			agent.setMode('sleeping')
		})
	}, [agents])

	const isFollowing = useValue(
		'is following fairy',
		() => {
			return getFollowingFairyId(editor) === agent.id
		},
		[editor, agent]
	)

	const toggleFollow = useCallback(() => {
		if (isFollowing) {
			agent.stopFollowing()
		} else {
			agent.startFollowing()
		}
	}, [agent, isFollowing])

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
	const debugViewLabel = useMsg(fairyMessages.debugView)
	const resetEverythingLabel = useMsg(fairyMessages.resetEverything)
	const fairyManagementLabel = useMsg(fairyMessages.fairyManagement)

	const projects = useValue($fairyProjects)
	const currentProject = useMemo(() => {
		return (
			projects.find((project) => project.members.some((member) => member.id === agent.id)) ?? null
		)
	}, [projects, agent])
	const canDisbandGroup = currentProject && currentProject.members.length > 1

	const disbandGroup = useCallback(() => {
		if (!currentProject) return

		disbandProject(currentProject.id, editor)
	}, [currentProject, editor])

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

	const openDebugDialog = useCallback(
		(initialTabId?: string) => {
			addDialog({
				component: ({ onClose }) => (
					<FairyDebugDialog agents={agents} onClose={onClose} initialTabId={initialTabId} />
				),
			})
		},
		[addDialog, agents]
	)

	const hasChatHistory = useValue('has-chat-history', () => agent.$chatHistory.get().length > 0, [
		agent,
	])

	const resetAllChats = useCallback(() => {
		agents.forEach((agent) => {
			if (agent.isSleeping()) return
			agent.reset()
		})
	}, [agents])

	const resetEverything = useCallback(() => {
		// Stop all running tasks
		agents.forEach((agent) => {
			agent.cancel()
		})

		// Clear the todo list and projects
		clearFairyTasksAndProjects()

		// Reset all chats
		agents.forEach((agent) => {
			agent.reset()
		})

		// Delete all fairies
		app.z.mutate.user.deleteAllFairyConfigs()
		agents.forEach((agent) => {
			agent.dispose()
		})
	}, [agents, app])

	if (canDisbandGroup && currentProject) {
		return (
			<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
				<TldrawUiMenuGroup id="fairy-group-menu">
					<TldrawUiMenuItem id="disband-group" onSelect={disbandGroup} label={disbandGroupLabel} />
					<TldrawUiMenuItem
						id="debug-fairies"
						onSelect={() => openDebugDialog(agent.id)}
						label={debugViewLabel}
					/>
				</TldrawUiMenuGroup>
			</TldrawUiMenuContextProvider>
		)
	}

	if (agent.isSleeping()) {
		return (
			<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
				<TldrawUiMenuGroup id="fairy-sleep-menu">
					<TldrawUiMenuItem
						id="wake-fairy"
						onSelect={() => agent.setMode('idling')}
						label={wakeFairyLabel}
					/>
				</TldrawUiMenuGroup>
				<TldrawUiMenuGroup id="fairy-management-menu">
					{isDevelopmentEnv && (
						<TldrawUiMenuItem
							id="debug-fairies"
							onSelect={() => openDebugDialog(agent.id)}
							label={debugViewLabel}
						/>
					)}
					<TldrawUiMenuItem
						id="reset-everything"
						onSelect={resetEverything}
						label={resetEverythingLabel}
					/>
				</TldrawUiMenuGroup>
			</TldrawUiMenuContextProvider>
		)
	}

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="single-fairy-menu">
				<TldrawUiMenuItem id="go-to-fairy" onSelect={() => agent.zoomTo()} label={goToFairyLabel} />
				<TldrawUiMenuItem
					id="summon-fairy"
					onSelect={() => agent.summon()}
					label={summonFairyLabel}
				/>
				<TldrawUiMenuItem
					id="follow-fairy"
					onSelect={toggleFollow}
					label={isFollowing ? unfollowFairyLabel : followFairyLabel}
				/>
				<TldrawUiMenuItem
					id="reset-fairy-chat"
					onSelect={() => agent.reset()}
					label={resetChatLabel}
					disabled={!hasChatHistory}
				/>
				<TldrawUiMenuItem id="put-away-fairy" onSelect={putAwayFairy} label={putAwayFairyLabel} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-management-menu">
				<TldrawUiMenuSubmenu id="fairy-management-submenu" label={fairyManagementLabel}>
					<TldrawUiMenuItem
						id="summon-all-fairies"
						onSelect={summonAllFairies}
						label={summonAllFairiesLabel}
					/>
					<TldrawUiMenuItem
						id="put-away-all-fairies"
						onSelect={putAwayAllFairies}
						label={putAwayAllFairiesLabel}
					/>
					<TldrawUiMenuGroup id="fairy-chat-menu">
						{menuType === 'context-menu' && (
							<TldrawUiMenuItem
								id="new-chat"
								onSelect={() => agent.reset()}
								label={resetChatLabel}
							/>
						)}
						<TldrawUiMenuItem
							id="reset-all-chats"
							onSelect={resetAllChats}
							label={resetAllChatsLabel}
						/>
						{isDevelopmentEnv && (
							<>
								<TldrawUiMenuItem
									id="reset-everything"
									onSelect={resetEverything}
									label={resetEverythingLabel}
								/>
								<TldrawUiMenuItem
									id="debug-fairies"
									onSelect={() => openDebugDialog(agent.id)}
									label={debugViewLabel}
								/>
							</>
						)}
					</TldrawUiMenuGroup>
				</TldrawUiMenuSubmenu>
				{/* TODO: Reinstate */}
				{/* <TldrawUiMenuItem
					id="configure-fairy"
					onSelect={() => configureFairy(agent)}
					label={customizeFairyLabel}
				/> */}
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
