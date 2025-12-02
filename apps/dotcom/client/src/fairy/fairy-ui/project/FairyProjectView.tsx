import {
	CancelIcon,
	FAIRY_VISION_DIMENSIONS,
	FairyModeDefinition,
	FairyProject,
	FairyProjectRole,
	LipsIcon,
} from '@tldraw/fairy-shared'
import { KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Box, Editor, uniqueId, useValue } from 'tldraw'
import { useTldrawAppUiEvents } from '../../../tla/utils/app-ui-events'
import { getIsCoarsePointer } from '../../../tla/utils/getIsCoarsePointer'
import { F, useMsg } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { getRandomNoInputMessage } from '../../fairy-helpers/getRandomNoInputMessage'
import { fairyMessages } from '../../fairy-messages'
import { FairyProjectChatContent } from '../chat/FairyProjectChatContent'

interface FairyProjectViewProps {
	editor: Editor
	agents: FairyAgent[]
	orchestratorAgent: FairyAgent | null
	onProjectStarted?(orchestrator: FairyAgent): void
	onClose(): void
}

export function FairyProjectView({
	editor,
	agents,
	orchestratorAgent,
	onProjectStarted,
	onClose,
}: FairyProjectViewProps) {
	const fairyApp = useFairyApp()
	const trackEvent = useTldrawAppUiEvents()
	const [inputValue, setInputValue] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	// Determine the project state
	const project = useValue('project', () => orchestratorAgent?.getProject() ?? null, [
		orchestratorAgent,
	])

	const isPreProject = !project

	// Get project tasks for ongoing project
	const projectTasks = useValue(
		'project-tasks',
		() => {
			if (!project || !fairyApp) return []
			return fairyApp.tasks.getTasksByProjectId(project.id)
		},
		[project, fairyApp]
	)

	// Check if any agents are generating
	const isGenerating = useValue(
		'generating',
		() => {
			if (orchestratorAgent) {
				return orchestratorAgent.requests.isGenerating()
			}
			return agents.some((agent) => agent.requests.isGenerating())
		},
		[orchestratorAgent, agents]
	)

	const isPlanning = isGenerating && projectTasks.length === 0 && project

	const projectTitle = useValue('project-title', () => project?.title ?? null, [project])

	// Pre-project: get leader and followers
	const leaderAgent = agents[0] ?? null
	const followerAgents = useValue(
		'follower-agents',
		() => {
			if (!leaderAgent || !isPreProject || !fairyApp) return []

			return agents.filter(
				(agent) =>
					agent.id !== leaderAgent.id &&
					fairyApp.projects.getProjectByAgentId(agent.id) === undefined
			)
		},
		[agents, leaderAgent, isPreProject, fairyApp]
	)

	const orchestratorName = useValue(
		'orchestrator-name',
		() => orchestratorAgent?.getConfig()?.name ?? 'your partner',
		[orchestratorAgent]
	)

	// Cancel logic
	const shouldCancel = isGenerating && inputValue === ''

	// Auto-resize textarea
	useLayoutEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
		}
	}, [inputValue])

	// Focus textarea on mount
	useEffect(() => {
		if (textareaRef.current && !getIsCoarsePointer()) {
			textareaRef.current.focus()
		}
	}, [])

	// Build the system prompt for starting a project
	const getGroupChatPrompt = useCallback(
		(instruction: string, followers: FairyAgent[], isDuo: boolean) => {
			if (isDuo) {
				const partnerName = followers[0]?.getConfig()?.name ?? 'your partner'
				const partnerId = followers[0]?.id ?? ''
				return `You are collaborating with your partner on a duo project. You are the leader of the duo.You have been instructed to do this project:
${instruction}.
A project has automatically been created, but you need to start it yourself. You have been placed into duo orchestrator mode. You are working together with your partner to complete this project. Your partner is:
- name: ${partnerName} (id: ${partnerId})
You are to complete the project together. You can assign tasks to your partner or work on tasks yourself. As you are the leader of the duo, your priority is to assign tasks for your partner to complete, but you may do tasks yourself as well, if it makes sense to work in parallel. Make sure to give the approximate locations of the work to be done, if relevant, in order to make sure you both don't get confused if there are multiple tasks to be done.`
			} else {
				const followerNames = followers
					.map((agent) => `- name: ${agent.getConfig()?.name} (id: ${agent.id})`)
					.join('\n')
				return `You are the leader of a group of fairies who have been instructed to do this project:
${instruction}.
A project has automatically been created, but you need to start it yourself. You have been placed into orchestrator mode. You are in charge of making sure the other fairies follow your instructions and complete the project together. Your teammates are:
${followerNames}
You are to complete the project together.
Make sure to give the approximate locations of the work to be done, if relevant, in order to make sure fairies dont get confused if there are multiple tasks to be done.`
			}
		},
		[]
	)

	// Handle creating a new project (pre-project state)
	const handleCreateProject = useCallback(
		(value: string) => {
			if (!leaderAgent || !value.trim()) return

			const isDuo = followerAgents.length === 1
			const agentAttributes: { role: FairyProjectRole; mode: FairyModeDefinition['type'] } = {
				role: isDuo ? 'duo-orchestrator' : 'orchestrator',
				mode: isDuo ? 'duo-orchestrating-active' : 'orchestrating-active',
			}

			// Clear chat history for all agents before starting new project
			leaderAgent.chat.clear()
			followerAgents.forEach((agent) => {
				agent.chat.clear()
			})

			const newProjectId = uniqueId(5)
			const newProject: FairyProject = {
				id: newProjectId,
				title: '',
				description: '',
				color: 'white',
				members: [
					{
						id: leaderAgent.id,
						role: agentAttributes.role,
					},
					...followerAgents.map((agent) => ({ id: agent.id, role: 'drone' as const })),
				],
				plan: '',
			}

			trackEvent('fairy-start-project', {
				source: 'fairy-chat',
				projectId: newProjectId,
				memberCount: newProject.members.length,
				projectType: isDuo ? 'duo' : 'group',
			})

			if (fairyApp) {
				fairyApp.projects.addProject(newProject)

				// Select all fairies in the newly created project
				const allAgents = fairyApp.agents.getAgents()
				const projectMemberIds = new Set(newProject.members.map((member) => member.id))
				allAgents.forEach((agent) => {
					const shouldSelect = projectMemberIds.has(agent.id)
					agent.updateEntity((f) => (f ? { ...f, isSelected: shouldSelect } : f))
				})
			}

			// Set leader as orchestrator
			leaderAgent.interrupt({
				mode: agentAttributes.mode,
				input: null,
			})

			// Set followers as standing by
			followerAgents.forEach((agent) => {
				agent.interrupt({ mode: 'standing-by', input: null })
			})

			// Summon all fairies to the orchestrator
			// Leader (orchestrator) at center
			leaderAgent.position.summon()

			// Followers positioned around the orchestrator
			followerAgents.forEach((agent, index) => {
				// Position followers in a horizontal line, offset from the orchestrator
				const offset = { x: (index + 1) * 120, y: 0 }
				agent.position.summon(offset)
			})

			// Send the prompt to the leader
			const groupChatPrompt = getGroupChatPrompt(value, followerAgents, isDuo)
			leaderAgent.prompt({
				source: 'user',
				agentMessages: [groupChatPrompt],
				userMessages: [value],
			})

			onProjectStarted?.(leaderAgent)
			setInputValue('')
		},
		[leaderAgent, followerAgents, getGroupChatPrompt, onProjectStarted, trackEvent, fairyApp]
	)

	// Handle interrupting an ongoing project with new instructions
	const handleProjectInterrupt = useCallback(
		(value: string) => {
			if (!orchestratorAgent || !project) return

			const projectMembers = project.members.length
			const isDuo = projectMembers === 2
			const currentMode = orchestratorAgent.mode.getMode()

			// If orchestrator was working on a task, reset it to todo
			if (currentMode === 'working-orchestrator' && fairyApp) {
				const myInProgressTasks = fairyApp.tasks
					.getTasks()
					.filter(
						(task) => task.assignedTo === orchestratorAgent.id && task.status === 'in-progress'
					)
				myInProgressTasks.forEach((task) => {
					fairyApp.tasks.setTaskStatus(task.id, 'todo')
				})
			}

			// Get fairy position for bounds
			const fairyPosition = orchestratorAgent.getEntity()?.position
			if (!fairyPosition) return
			const fairyVision = Box.FromCenter(fairyPosition, FAIRY_VISION_DIMENSIONS)

			// Build an augmentation prompt that instructs the agent to modify the existing project
			const augmentationPrompt = `The user has sent a follow-up instruction for the current project. DO NOT cancel or stop the existing project. Instead, augment the current plan based on this instruction:

${value}

IMPORTANT: You are continuing the same project. Based on the user's request:
- Create new tasks if the user wants additional work done
- Delete tasks using 'delete-project-task' if the user wants to cancel or remove specific work
- Mark tasks as done if they should be considered complete
- Adjust task assignments if needed
- Send a brief message explaining what changes you're making to the project

Do NOT start a completely new project. Respond with a message action first explaining your plan changes, then modify tasks as needed.`

			// Interrupt with the correct mode
			orchestratorAgent.interrupt({
				mode: isDuo ? 'duo-orchestrating-active' : 'orchestrating-active',
				input: {
					agentMessages: [augmentationPrompt],
					userMessages: [value],
					bounds: fairyVision,
					source: 'user',
				},
			})

			setInputValue('')
		},
		[orchestratorAgent, project, fairyApp]
	)

	// Handle submit (unified for both states)
	const handleSubmit = useCallback(
		(value: string) => {
			// Handle cancel (disband project)
			if (shouldCancel && project && fairyApp) {
				fairyApp.projects.disbandProject(project.id)
				return
			}

			// Use random message if empty
			const messageToSend = value.trim() || getRandomNoInputMessage()

			if (isPreProject) {
				handleCreateProject(messageToSend)
			} else {
				handleProjectInterrupt(messageToSend)
			}
		},
		[shouldCancel, project, isPreProject, handleCreateProject, handleProjectInterrupt, fairyApp]
	)

	const handleButtonClick = () => {
		if (shouldCancel) {
			if (project && fairyApp) {
				fairyApp.projects.disbandProject(project.id)
			}
		} else {
			handleSubmit(inputValue)
		}
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(inputValue)
		} else if (e.key === 'Escape') {
			onClose()
		}
	}

	// Messages
	const instructGroupPlaceholder = useMsg(fairyMessages.instructGroupPlaceholder)
	const stopTitle = useMsg(fairyMessages.stopTitle)
	const sendTitle = useMsg(fairyMessages.sendTitle)

	// Dynamic placeholder based on project state
	const placeholder = isPreProject
		? instructGroupPlaceholder
		: `Speak to ${orchestratorName?.split(' ')[0] ?? ''}...`

	// Empty state
	if (agents.length === 0) {
		return (
			<div className="fairy-group-chat">
				<p>
					<F defaultMessage="No fairies selected" />
				</p>
			</div>
		)
	}

	return (
		<div className="fairy-project-view">
			<div className="fairy-project-chat-view">
				{!isPreProject && orchestratorAgent && (
					<FairyProjectChatContent
						orchestratorAgent={orchestratorAgent}
						agents={agents}
						isPlanning={!!isPlanning}
						projectTitle={projectTitle}
					/>
				)}
			</div>

			<div className="fairy-group-chat-input">
				<div className="fairy-group-chat-input__wrapper">
					<textarea
						ref={textareaRef}
						className="fairy-group-chat-input__field"
						placeholder={placeholder}
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						autoFocus={!getIsCoarsePointer() && !editor.menus.hasAnyOpenMenus()}
						spellCheck={false}
					/>
				</div>
				<button
					onClick={handleButtonClick}
					className="fairy-group-chat-input__submit"
					title={shouldCancel ? stopTitle : sendTitle}
				>
					{shouldCancel ? <CancelIcon /> : <LipsIcon />}
				</button>
			</div>
		</div>
	)
}
