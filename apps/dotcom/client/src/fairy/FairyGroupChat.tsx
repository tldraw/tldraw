import { CancelIcon, FairyProject, LipsIcon } from '@tldraw/fairy-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { uniqueId, useValue } from 'tldraw'
import { F, useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { addProject, getProjectByAgentId } from './FairyProjects'

export function FairyGroupChat({
	agents,
	onStartProject,
}: {
	agents: FairyAgent[]
	onStartProject(orchestratorAgent: FairyAgent): void
}) {
	const leaderAgentId = agents[0]?.id ?? null

	const [instruction, setInstruction] = useState('')
	const instructionTextareaRef = useRef<HTMLTextAreaElement>(null)

	const leaderAgent = useValue(
		'leader-agent',
		() => (leaderAgentId ? (agents.find((agent) => agent.id === leaderAgentId) ?? null) : null),
		[agents, leaderAgentId]
	)

	// TODO clean up logic for how we split out "available" agents, "project" agents, etc

	const followerAgents = useValue(
		'follower-agents',
		() =>
			leaderAgentId
				? agents.filter(
						(agent) => agent.id !== leaderAgentId && getProjectByAgentId(agent.id) === undefined
					)
				: [],
		[agents, leaderAgentId]
	)

	const areAnyProjectAgentsGenerating = useValue(
		'areAnyProjectAgentsGenerating',
		() => followerAgents.some((agent) => agent.isGenerating()) || leaderAgent?.isGenerating(),
		[followerAgents, leaderAgent]
	)

	useEffect(() => {
		if (instructionTextareaRef.current) {
			instructionTextareaRef.current.spellcheck = false
		}
	}, [])

	const getGroupChatPrompt = useCallback(
		(instruction: string, followerAgents: FairyAgent[], isDuo: boolean) => {
			if (isDuo) {
				const partnerName = followerAgents[0]?.$fairyConfig.get()?.name ?? 'your partner'
				const partnerId = followerAgents[0]?.id ?? ''
				return `You are collaborating with your partner on a duo project. You are the leader of the duo.You have been instructed to do this project:
${instruction}. 
A project has automatically been created, but you need to start it yourself. You have been placed into duo orchestrator mode. You are working together with your partner to complete this project. Your partner is:
- name: ${partnerName} (id: ${partnerId})
You are to complete the project together. You can assign tasks to your partner or work on tasks yourself. As you are the leader of the duo, your priority is to assign tasks for your partner to complete, but you may do tasks yourself as well, if it makes sense to work in parallel. Make sure to give the approximate locations of the work to be done, if relevant, in order to make sure you both don't get confused if there are multiple tasks to be done.`
			} else {
				const followerNames = followerAgents
					.map((agent) => `- name: ${agent.$fairyConfig.get()?.name} (id: ${agent.id})`)
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

	const handleInstructGroupChat = useCallback(
		async (value: string) => {
			if (!leaderAgent || !value.trim()) {
				return
			}

			// Check if this is a duo project (exactly 2 fairies: 1 leader + 1 follower)
			const isDuo = followerAgents.length === 1

			const newProjectId = uniqueId(5)
			const newProject: FairyProject = {
				id: newProjectId,
				title: '',
				description: '',
				color: 'white',
				members: [
					{
						id: leaderAgent.id,
						role: isDuo ? ('duo-orchestrator' as const) : ('orchestrator' as const),
					},
					...followerAgents.map((agent) => ({ id: agent.id, role: 'drone' as const })),
				],
				plan: '',
			}

			addProject(newProject)

			// Set leader as orchestrator or duo-orchestrator
			leaderAgent.interrupt({
				mode: isDuo ? 'duo-orchestrating-active' : 'orchestrating-active',
				input: null,
			})

			// Set followers as drones
			followerAgents.forEach((agent) => {
				agent.interrupt({ mode: 'standing-by', input: null })
			})

			// Send the prompt to the leader
			const groupChatPrompt = getGroupChatPrompt(value, followerAgents, isDuo)
			leaderAgent.prompt({
				source: 'user',
				agentMessages: [groupChatPrompt],
				userMessages: [value],
			})

			// Select the orchestrator and switch to their chat panel
			onStartProject(leaderAgent)

			// Clear the input
			setInstruction('')
		},
		[getGroupChatPrompt, leaderAgent, followerAgents, onStartProject]
	)

	const shouldCancel = areAnyProjectAgentsGenerating && instruction === ''

	const handleButtonClick = () => {
		handleInstructGroupChat(instruction)
	}

	const instructGroupPlaceholder = useMsg(fairyMessages.instructGroupPlaceholder)
	const selectLeaderFirstPlaceholder = useMsg(fairyMessages.selectLeaderFirstPlaceholder)
	const stopTitle = useMsg(fairyMessages.stopTitle)
	const sendTitle = useMsg(fairyMessages.sendTitle)

	const formattedNames = useValue(
		'formatted-fairy-names',
		() => {
			const names = agents.map((agent) => agent.$fairyConfig.get()?.name ?? 'fairy')
			if (names.length === 0) return ''
			if (names.length === 1) return names[0]
			if (names.length === 2) return `${names[0]} and ${names[1]}`
			return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
		},
		[agents]
	)

	if (agents.length === 0)
		return (
			<div>
				<p>
					<F defaultMessage="No fairies selected" />
				</p>
			</div>
		)

	return (
		<div className="fairy-group-chat">
			<div className="fairy-group-chat-leader-toggle-container">
				<p>Summoning {formattedNames}</p>
			</div>
			<div className="fairy-group-chat-input">
				<div className="fairy-group-chat-input__wrapper">
					<textarea
						ref={instructionTextareaRef}
						placeholder={leaderAgent ? instructGroupPlaceholder : selectLeaderFirstPlaceholder}
						value={instruction}
						onChange={(e) => setInstruction(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault()
								handleInstructGroupChat(instruction)
							}
						}}
						autoFocus
						disabled={!leaderAgent}
						className="fairy-group-chat-input__field"
						style={{ cursor: leaderAgent ? 'text' : 'not-allowed' }}
					/>
				</div>
				<button
					onClick={handleButtonClick}
					disabled={!leaderAgent || (instruction === '' && !areAnyProjectAgentsGenerating)}
					className="fairy-group-chat-input__submit"
					title={shouldCancel ? stopTitle : sendTitle}
				>
					{shouldCancel ? <CancelIcon /> : <LipsIcon />}
				</button>
			</div>
		</div>
	)
}
