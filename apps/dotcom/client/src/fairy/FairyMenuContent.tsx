import { useCallback, useMemo } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDefaultHelpers,
	useEditor,
	useValue,
} from 'tldraw'
import { useApp } from '../tla/hooks/useAppState'
import { useTldrawAppUiEvents } from '../tla/utils/app-ui-events'
import { useMsg } from '../tla/utils/i18n'
import { isDevelopmentEnv } from '../utils/env'
import { FairyAgent, getFollowingFairyId } from './fairy-agent/agent/FairyAgent'
import { $fairyAgentsAtom } from './fairy-agent/agent/fairyAgentsAtom'
import { fairyMessages } from './fairy-messages'
import { FairyConfigDialog } from './FairyConfigDialog'
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
	const trackEvent = useTldrawAppUiEvents()

	const _configureFairy = useCallback(
		(agent: FairyAgent) => {
			addDialog({
				component: ({ onClose }) => <FairyConfigDialog agent={agent} onClose={onClose} />,
			})
		},
		[addDialog]
	)

	const putAwayFairy = useCallback(() => {
		trackEvent('fairy-sleep', { source: 'fairy-panel', feat: 'fairy' })
		agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false, pose: 'sleeping' } : f))
		agent.setMode('sleeping')
	}, [agent, trackEvent])

	const putAwayAllFairies = useCallback(() => {
		trackEvent('fairy-sleep-all', { source: 'fairy-panel', feat: 'fairy' })
		agents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false, pose: 'sleeping' } : f))
			agent.setMode('sleeping')
		})
	}, [agents, trackEvent])

	const isFollowing = useValue(
		'is following fairy',
		() => {
			return getFollowingFairyId(editor) === agent.id
		},
		[editor, agent]
	)

	const toggleFollow = useCallback(() => {
		if (isFollowing) {
			trackEvent('fairy-unfollow', { source: 'fairy-panel', feat: 'fairy' })
			agent.stopFollowing()
		} else {
			trackEvent('fairy-follow', { source: 'fairy-panel', feat: 'fairy' })
			agent.startFollowing()
		}
	}, [agent, isFollowing, trackEvent])

	const goToFairyLabel = useMsg(fairyMessages.goToFairy)
	const summonFairyLabel = useMsg(fairyMessages.summonFairy)
	const summonAllFairiesLabel = useMsg(fairyMessages.summonAllFairies)
	const followFairyLabel = useMsg(fairyMessages.followFairy)
	const unfollowFairyLabel = useMsg(fairyMessages.unfollowFairy)
	const resetChatLabel = useMsg(fairyMessages.resetChat)
	const resetAllChatsLabel = useMsg(fairyMessages.resetAllChats)
	const _customizeFairyLabel = useMsg(fairyMessages.customizeFairy)
	const putAwayFairyLabel = useMsg(fairyMessages.putAwayFairy)
	const putAwayAllFairiesLabel = useMsg(fairyMessages.putAwayAllFairies)
	const disbandGroupLabel = useMsg(fairyMessages.disbandGroup)
	const debugViewLabel = useMsg(fairyMessages.debugView)
	const resetEverythingLabel = useMsg(fairyMessages.resetEverything)

	const projects = useValue($fairyProjects)
	const currentProject = useMemo(() => {
		return (
			projects.find((project) => project.members.some((member) => member.id === agent.id)) ?? null
		)
	}, [projects, agent])
	const canDisbandGroup = currentProject && currentProject.members.length > 1

	const disbandGroup = useCallback(() => {
		if (!currentProject) return
		if (currentProject.members.length <= 1) return

		trackEvent('fairy-disband-group', { source: 'fairy-panel', feat: 'fairy' })
		disbandProject(currentProject.id, agents)
	}, [currentProject, agents, trackEvent])

	const summonAllFairies = useCallback(() => {
		trackEvent('fairy-summon-all', { source: 'fairy-panel', feat: 'fairy' })
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
	}, [agents, trackEvent])

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

	const resetAllChats = useCallback(() => {
		trackEvent('fairy-reset-all-chats', { source: 'fairy-panel', feat: 'fairy' })
		agents.forEach((agent) => {
			agent.reset()
		})
	}, [agents, trackEvent])

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

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			{menuType === 'context-menu' && (
				<TldrawUiMenuGroup id="fairy-movement-menu">
					<TldrawUiMenuItem
						id="summon-fairy"
						onSelect={() => {
							trackEvent('fairy-summon', { source: 'fairy-panel', feat: 'fairy' })
							agent.summon()
						}}
						label={summonFairyLabel}
					/>
					<TldrawUiMenuItem
						id="go-to-fairy"
						onSelect={() => {
							trackEvent('fairy-zoom-to', { source: 'fairy-panel', feat: 'fairy' })
							agent.zoomTo()
						}}
						label={goToFairyLabel}
					/>
					<TldrawUiMenuItem
						id="follow-fairy"
						onSelect={toggleFollow}
						label={isFollowing ? unfollowFairyLabel : followFairyLabel}
					/>
				</TldrawUiMenuGroup>
			)}
			{menuType === 'menu' && (
				<TldrawUiMenuItem
					id="summon-all-fairies"
					onSelect={summonAllFairies}
					label={summonAllFairiesLabel}
				/>
			)}

			{menuType === 'menu' && (
				<TldrawUiMenuItem
					id="put-away-all-fairies"
					onSelect={putAwayAllFairies}
					label={putAwayAllFairiesLabel}
				/>
			)}

			{menuType === 'context-menu' && (
				<TldrawUiMenuGroup id="fairy-put-away-menu">
					<TldrawUiMenuItem id="put-away-fairy" onSelect={putAwayFairy} label={putAwayFairyLabel} />
				</TldrawUiMenuGroup>
			)}

			<TldrawUiMenuGroup id="fairy-chat-menu">
				{menuType === 'context-menu' && (
					<TldrawUiMenuItem
						id="new-chat"
						onSelect={() => {
							trackEvent('fairy-reset-chat', { source: 'fairy-panel', feat: 'fairy' })
							agent.reset()
						}}
						label={resetChatLabel}
					/>
				)}
				{menuType === 'menu' && (
					<TldrawUiMenuItem
						id="reset-all-chats"
						onSelect={resetAllChats}
						label={resetAllChatsLabel}
					/>
				)}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-config-menu">
				{/* TODO: Reinstate */}
				{/* <TldrawUiMenuItem
					id="configure-fairy"
					onSelect={() => configureFairy(agent)}
					label={customizeFairyLabel}
				/> */}
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
