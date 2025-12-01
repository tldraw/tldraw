import { ChatHistoryActionItem, IndentIcon } from '@tldraw/fairy-shared'
import { useMemo } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { FairyMiniAvatar, FairyMiniAvatarById } from '../../fairy-sprite/sprites/Avatar'
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
	const fairyApp = useFairyApp()
	const historyItems = useValue('chat-history', () => orchestratorAgent.chat.getHistory(), [
		orchestratorAgent,
	])

	const projectTasks = useValue(
		'project-tasks',
		() => {
			const project = orchestratorAgent.getProject()
			if (!project || !fairyApp) return []
			return fairyApp.tasks.getTasksByProjectId(project.id)
		},
		[orchestratorAgent, fairyApp]
	)

	const filteredItems = useMemo(
		() => filterChatHistoryByMode(historyItems, 'project'),
		[historyItems]
	)
	const sections = useMemo(() => getAgentHistorySections(filteredItems), [filteredItems])
	const firstSection = sections[0]
	const additionalSections = sections.slice(1)
	const firstUserPrompt = firstSection?.prompt

	const isGenerating = useValue('is-generating', () => orchestratorAgent.requests.isGenerating(), [
		orchestratorAgent,
	])

	// Determine the project status
	const projectStatus = useMemo((): { text: string; isAnimating: boolean } => {
		// Planning phase - no tasks yet
		if (isPlanning) {
			return { text: 'Creating a plan...', isAnimating: true }
		}

		const hasTasks = projectTasks.length > 0
		const allTasksDone = hasTasks && projectTasks.every((task) => task.status === 'done')
		const hasInProgressTasks = projectTasks.some((task) => task.status === 'in-progress')
		const hasOutstandingTasks = hasTasks && projectTasks.some((task) => task.status === 'todo')

		// All tasks are done but project not ended - reviewing state
		if (allTasksDone && isGenerating) {
			return { text: 'Reviewing completed tasks...', isAnimating: true }
		}

		// Some tasks are in progress - waiting state
		if (hasInProgressTasks) {
			const count = projectTasks.filter((task) => task.status === 'in-progress').length
			return {
				text: `Waiting for ${count} task${count === 1 ? '' : 's'} to complete...`,
				isAnimating: true,
			}
		}

		// Orchestrator is generating with outstanding tasks but none in-progress yet
		// This is the "coordinating/directing" state
		if (isGenerating && hasOutstandingTasks) {
			return { text: 'Coordinating...', isAnimating: true }
		}

		// Show project title if available
		if (projectTitle) {
			return { text: projectTitle, isAnimating: false }
		}

		// Fallback
		return { text: 'Created plan', isAnimating: false }
	}, [isPlanning, projectTasks, isGenerating, projectTitle])
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
					className={`fairy-project-chat-action ${projectStatus.isAnimating ? 'fairy-project-chat-action--planning' : ''}`}
				>
					<FairyMiniAvatar agent={orchestratorAgent} />
					<span>{projectStatus.text}</span>
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
											: task.status === 'in-progress'
												? 'fairy-project-chat-task-text--in-progress'
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
