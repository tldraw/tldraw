import { ChatHistoryActionItem, IndentIcon } from '@tldraw/fairy-shared'
import { useMemo } from 'react'
import { useValue } from 'tldraw'
import { FairyMiniAvatar, FairyMiniAvatarById } from '../../fairy-sprite/sprites/Avatar'
import { getFairyTasksByProjectId } from '../../FairyTaskList'
import { FairyAgent } from '../agent/FairyAgent'
import { FairyChatHistoryAction } from './FairyChatHistoryAction'
import { getAgentHistorySections } from './FairyChatHistorySection'
import { filterChatHistoryByMode } from './filterChatHistoryByMode'

interface FairyProjectChatContentProps {
	orchestratorAgent: FairyAgent
	agents: FairyAgent[]
	isPlanning: boolean
	projectTitle: string | null
}

export function FairyProjectChatContent({
	orchestratorAgent,
	agents,
	isPlanning,
	projectTitle,
}: FairyProjectChatContentProps) {
	const historyItems = useValue('chat-history', () => orchestratorAgent.$chatHistory.get(), [
		orchestratorAgent,
	])

	const projectTasks = useValue(
		'project-tasks',
		() => {
			const project = orchestratorAgent.getProject()
			if (!project) return []
			return getFairyTasksByProjectId(project.id)
		},
		[orchestratorAgent]
	)

	const filteredItems = useMemo(
		() => filterChatHistoryByMode(historyItems, 'project'),
		[historyItems]
	)
	const sections = useMemo(() => getAgentHistorySections(filteredItems), [filteredItems])
	const firstSection = sections[0]
	const additionalSections = sections.slice(1)
	const firstUserPrompt = firstSection?.prompt

	const getPlanStatusText = () => {
		if (isPlanning) return 'Creating a plan...'
		if (projectTitle) return projectTitle
		return 'Created plan'
	}

	const hasTasks = projectTasks.length > 0

	const responseItems = useMemo(() => {
		return additionalSections.flatMap((section) => {
			const userPrompt =
				section.prompt?.userFacingMessage && section.prompt.promptSource === 'user'
					? [{ type: 'user' as const, content: section.prompt.userFacingMessage }]
					: []

			const messageActions = section.items
				.filter(
					(item): item is ChatHistoryActionItem =>
						item.type === 'action' && item.action._type === 'message'
				)
				.map((item) => ({ type: 'action' as const, item }))

			return [...userPrompt, ...messageActions]
		})
	}, [additionalSections])

	return (
		<>
			{firstUserPrompt?.userFacingMessage && (
				<div className="fairy-chat-history-prompt-user">{firstUserPrompt.userFacingMessage}</div>
			)}

			<div className="fairy-project-header">
				<div
					className={`fairy-project-chat-action ${isPlanning ? 'fairy-project-chat-action--planning' : ''}`}
				>
					<FairyMiniAvatar agent={orchestratorAgent} />
					<span>{getPlanStatusText()}</span>
				</div>

				{hasTasks && (
					<div className="fairy-project-chat-tasks">
						{projectTasks.map((task) => (
							<div key={task.id} className="fairy-project-chat-task">
								<IndentIcon />
								{task.assignedTo ? (
									<FairyMiniAvatarById agentId={task.assignedTo} agents={agents} />
								) : (
									<FairyMiniAvatar agent={orchestratorAgent} />
								)}
								<span
									className={`fairy-project-chat-action-text ${
										task.status === 'done'
											? 'fairy-project-chat-task-text--done'
											: 'fairy-project-chat-task-text--pending'
									}`}
								>
									{task.title || task.text}
								</span>
							</div>
						))}
					</div>
				)}
			</div>

			{responseItems.map((msg, i) =>
				msg.type === 'user' ? (
					<div key={i} className="fairy-chat-history-prompt-user">
						{msg.content}
					</div>
				) : (
					<FairyChatHistoryAction
						key={i}
						item={msg.item}
						agent={orchestratorAgent}
						group={{ items: [msg.item], isFinalGroup: false }}
					/>
				)
			)}
		</>
	)
}
