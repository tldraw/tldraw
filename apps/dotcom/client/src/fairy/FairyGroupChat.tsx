import { FairyProject } from '@tldraw/fairy-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TldrawUiToolbar, TldrawUiToolbarButton, uniqueId, useValue } from 'tldraw'
import { F, useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'
import { $fairyProjects, addProject, getProjectByAgentId } from './FairyProjects'

export function FairyGroupChat({
	agents,
	onStartProject,
}: {
	agents: FairyAgent[]
	onStartProject(orchestratorAgent: FairyAgent): void
}) {
	const [leaderAgentId, setLeaderAgentId] = useState<string | null>(null)
	const [instruction, setInstruction] = useState('')
	const instructionTextareaRef = useRef<HTMLTextAreaElement>(null)

	const leaderAgent = useValue(
		'leader-agent',
		() => (leaderAgentId ? (agents.find((agent) => agent.id === leaderAgentId) ?? null) : null),
		[agents, leaderAgentId]
	)

	const leaderConfig = useValue('leader-config', () => leaderAgent?.$fairyConfig.get() ?? null, [
		leaderAgent,
	])

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

	const handleSetLeader = (agent: FairyAgent) => {
		setLeaderAgentId(agent.id)
	}

	const getGroupChatPrompt = useCallback((instruction: string, followerAgents: FairyAgent[]) => {
		const followerNames = followerAgents
			.map((agent) => `- name: ${agent.$fairyConfig.get()?.name} (id: ${agent.id})`)
			.join('\n')
		const prompt = `You are the leader of a group of fairies who have been instructed to do this project:
${instruction}. 
A project has automatically been created, but you need to start it yourself. You have been placed into orchestrator mode. You are in charge of making sure the other fairies follow your instructions and complete the project together. Your teammates are:
${followerNames}
You are to complete the project together.
Make sure to give the approximate locations of the work to be done, if relevant, in order to make sure fairies dont get confused if there are multiple tasks to be done.`
		return prompt
	}, [])

	const handleInstructGroupChat = useCallback(
		async (value: string) => {
			if (!leaderAgent || !value.trim()) {
				return
			}

			const newProjectId = uniqueId(5)
			const newProject: FairyProject = {
				id: newProjectId,
				title: '',
				description: '',
				color: 'grey',
				members: [
					{ id: leaderAgent.id, role: 'orchestrator' },
					...followerAgents.map((agent) => ({ id: agent.id, role: 'drone' as const })),
				],
				plan: '',
			}

			addProject(newProject)

			// Set leader as orchestrator
			leaderAgent.cancel()
			leaderAgent.setMode('orchestrating')

			// Set followers as drones
			followerAgents.forEach((agent) => {
				agent.cancel()
				agent.setMode('standing-by')
			})

			// Send the prompt to the leader
			const prompt = getGroupChatPrompt(value, followerAgents)
			leaderAgent.prompt({
				source: 'self',
				message: prompt,
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

	const leaderFairySelectionLabel = useMsg(fairyMessages.leaderFairySelection)
	const instructGroupPlaceholder = useMsg(fairyMessages.instructGroupPlaceholder)
	const selectLeaderFirstPlaceholder = useMsg(fairyMessages.selectLeaderFirstPlaceholder)
	const stopTitle = useMsg(fairyMessages.stopTitle)
	const sendTitle = useMsg(fairyMessages.sendTitle)

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
				<p>
					<F defaultMessage="Leader fairy will be given orchestration power" />
				</p>
				<TldrawUiToolbar orientation="horizontal" label={leaderFairySelectionLabel}>
					{agents.map((agent) => (
						<FairyLeaderToggle
							key={agent.id}
							agent={agent}
							agentIsSetAsLeader={leaderAgentId === agent.id}
							onClick={() => handleSetLeader(agent)}
						/>
					))}
				</TldrawUiToolbar>
				<div className="fairy-group-chat-leader-info">
					{leaderConfig ? (
						<>
							<p>
								<F defaultMessage="Name:" /> {leaderConfig.name}
							</p>
							<p>
								<F defaultMessage="Personality:" /> {leaderConfig.personality}
							</p>
						</>
					) : (
						<p>
							<F defaultMessage="No leader selected" />
						</p>
					)}
				</div>
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
					{shouldCancel ? '⏹' : '📣'}
				</button>
			</div>
		</div>
	)
}

function FairyLeaderToggle({
	agent,
	agentIsSetAsLeader,
	onClick,
}: {
	agent: FairyAgent
	agentIsSetAsLeader: boolean
	onClick(): void
}) {
	const fairyOutfit = useValue('fairy outfit', () => agent.$fairyConfig.get()?.outfit, [agent])
	const fairyEntity = useValue('fairy entity', () => agent.$fairyEntity.get(), [agent])
	const selectLeaderLabel = useMsg(fairyMessages.selectLeader)
	const deselectLeaderLabel = useMsg(fairyMessages.deselectLeader)

	const fairyHasProject = useValue(
		'fairy has project',
		() => getProjectByAgentId(agent.id) !== undefined,
		[$fairyProjects]
	)

	return (
		<TldrawUiToolbarButton
			onClick={onClick}
			type="icon"
			isActive={agentIsSetAsLeader}
			aria-label={agentIsSetAsLeader ? deselectLeaderLabel : selectLeaderLabel}
			disabled={fairyHasProject}
		>
			<FairySpriteComponent
				entity={fairyEntity}
				outfit={fairyOutfit}
				animated={false}
				tint={fairyHasProject ? 'gray' : undefined}
			/>
		</TldrawUiToolbarButton>
	)
}
