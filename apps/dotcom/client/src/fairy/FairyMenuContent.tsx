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
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent, getFollowingFairyId } from './fairy-agent/agent/FairyAgent'
import { $fairyAgentsAtom } from './fairy-agent/agent/fairyAgentsAtom'
import { fairyMessages } from './fairy-messages'
import { FairyConfigDialog } from './FairyConfigDialog'
import { FairyDebugDialog } from './FairyDebugDialog'
import { $fairyProjects, deleteProject } from './FairyProjects'
import { clearFairyTasks } from './FairyTaskList'

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
	const configureFairy = useCallback(
		(agent: FairyAgent) => {
			addDialog({
				component: ({ onClose }) => <FairyConfigDialog agent={agent} onClose={onClose} />,
			})
		},
		[addDialog]
	)

	const deleteFairy = useCallback(() => {
		agent.dispose()
		agent.deleteFairyConfig()
	}, [agent])

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

	const goToFairyLabel = useMsg(fairyMessages.goToFairy)
	const summonFairyLabel = useMsg(fairyMessages.summonFairy)
	const followFairyLabel = useMsg(fairyMessages.followFairy)
	const unfollowFairyLabel = useMsg(fairyMessages.unfollowFairy)
	const resetChatLabel = useMsg(fairyMessages.resetChat)
	const customizeFairyLabel = useMsg(fairyMessages.customizeFairy)
	const deleteFairyLabel = useMsg(fairyMessages.deleteFairy)
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
		if (!currentProject || currentProject.members.length <= 1) return
		const memberIds = new Set(currentProject.members.map((member) => member.id))
		const memberAgents = $fairyAgentsAtom
			.get(editor)
			.filter((memberAgent) => memberIds.has(memberAgent.id))

		memberAgents.forEach((memberAgent) => {
			memberAgent.setMode('idling')
			memberAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
		})

		deleteProject(currentProject.id)
	}, [currentProject, editor])

	const openDebugDialog = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <FairyDebugDialog agents={agents} onClose={onClose} />,
		})
	}, [addDialog, agents])

	const resetEverything = useCallback(() => {
		// Stop all running tasks
		agents.forEach((agent) => {
			agent.cancel()
		})

		// Clear the todo list and projects
		clearFairyTasks()

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
				</TldrawUiMenuGroup>
			</TldrawUiMenuContextProvider>
		)
	}

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="fairy-movement-menu">
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
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-chat-menu">
				<TldrawUiMenuItem id="new-chat" onSelect={() => agent.reset()} label={resetChatLabel} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-config-menu">
				<TldrawUiMenuItem
					id="configure-fairy"
					onSelect={() => configureFairy(agent)}
					label={customizeFairyLabel}
				/>
				<TldrawUiMenuItem id="delete-fairy" onSelect={deleteFairy} label={deleteFairyLabel} />
				<TldrawUiMenuItem id="debug-fairies" onSelect={openDebugDialog} label={debugViewLabel} />
				<TldrawUiMenuItem
					id="reset-everything"
					onSelect={resetEverything}
					label={resetEverythingLabel}
				/>
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
