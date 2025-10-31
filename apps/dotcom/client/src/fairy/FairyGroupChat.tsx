import { useCallback, useEffect, useRef, useState } from 'react'
import {
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	// uniqueId,
	useValue,
} from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'

export function FairyGroupChat({ agents }: { agents: FairyAgent[] }) {
	const [leaderAgentId, setLeaderAgentId] = useState<string | null>(null)
	const [instruction, setInstruction] = useState('')
	const instructionTextareaRef = useRef<HTMLTextAreaElement>(null)

	const leaderAgent = useValue(
		'leader-agent',
		() => (leaderAgentId ? (agents.find((agent) => agent.id === leaderAgentId) ?? null) : null),
		[agents, leaderAgentId]
	)

	const followerAgents = useValue(
		'follower-agents',
		() => (leaderAgentId ? agents.filter((agent) => agent.id !== leaderAgentId) : []),
		[agents, leaderAgentId]
	)

	const leaderConfig = useValue('leader-config', () => leaderAgent?.$fairyConfig.get() ?? null, [
		leaderAgent,
	])

	const areAnyGenerating = useValue(
		'areAnyGenerating',
		() => agents.some((agent) => agent.isGenerating()),
		[agents]
	)

	useEffect(() => {
		if (instructionTextareaRef.current) {
			instructionTextareaRef.current.spellcheck = false
		}
	}, [])

	const handleSetLeader = (agent: FairyAgent) => {
		setLeaderAgentId(agent.id)
	}

	const getGroupChatPrompt = useCallback(
		(instruction: string) => {
			const followerNames = followerAgents
				.map((agent) => `- name: ${agent.$fairyConfig.get()?.name} (id: ${agent.id})`)
				.join(', ')
			const prompt = `
            You are the leader of a group of fairies who have been instructed to do this project:
            ${instruction}. 
            You are in charge of making sure the other fairies follow your instructions and complete the project together. Your teammates are:
            ${followerNames}
            You are to complete the project together.
			Make sure to give the approximate locations of the work to be done, if relevant, in order to make sure fairies dont get confused if there are multiple tasks to be done.
        `
			// This project has id: ${uniqueId(5)}, all todo items you create should be prefixed with this id.
			return prompt
		},
		[followerAgents]
	)

	const handleInstructGroupChat = useCallback(
		async (value: string) => {
			// Cancel all agents
			agents.forEach((agent) => agent.cancel())

			if (!leaderAgent || !value.trim()) {
				return
			}

			// Set leader as orchestrator
			leaderAgent.$fairyConfig.update((config) => ({
				...config,
				wand: 'orchestrator',
			}))

			// Set followers as drones
			followerAgents.forEach((agent) => {
				agent.$fairyConfig.update((config) => ({
					...config,
					wand: 'drone',
				}))
			})

			// Send the prompt to the leader
			const prompt = getGroupChatPrompt(value)
			leaderAgent.prompt({
				type: 'schedule',
				messages: [prompt],
			})

			// Clear the input
			setInstruction('')
		},
		[agents, getGroupChatPrompt, leaderAgent, followerAgents]
	)

	const shouldCancel = areAnyGenerating && instruction === ''

	const handleButtonClick = () => {
		handleInstructGroupChat(instruction)
	}

	if (agents.length === 0)
		return (
			<div>
				<p>No fairies selected</p>
			</div>
		)

	return (
		<div className="fairy-group-chat">
			<div className="fairy-group-chat-leader-toggle-container">
				{/* <p>Select leader fairy</p> */}
				<p>Leader fairy will be given orchestration power</p>
				<TldrawUiToolbar orientation="horizontal" label="Queen fairy selection">
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
							<p>Name: {leaderConfig.name}</p>
							<p>Personality: {leaderConfig.personality}</p>
						</>
					) : (
						<p>No leader selected</p>
					)}
				</div>
			</div>
			<div className="fairy-group-chat-input">
				<div className="fairy-group-chat-input__wrapper">
					<textarea
						ref={instructionTextareaRef}
						placeholder={leaderAgent ? 'Instruct the group...' : 'Select a leader first...'}
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
					/>
				</div>
				<button
					onClick={handleButtonClick}
					disabled={!leaderAgent || (instruction === '' && !areAnyGenerating)}
					className="fairy-group-chat-input__submit"
					title={shouldCancel ? 'Stop' : 'Send'}
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

	return (
		<TldrawUiToolbarToggleGroup type="single" value={agentIsSetAsLeader ? 'on' : 'off'} asChild>
			<TldrawUiToolbarToggleItem
				// className="fairy-toggle-button"
				onClick={onClick}
				// onDoubleClick={onDoubleClick}
				type="icon"
				data-state={agentIsSetAsLeader ? 'on' : 'off'}
				data-isactive={agentIsSetAsLeader}
				aria-label={agentIsSetAsLeader ? 'Deselect leader' : 'Select leader'}
				value="on"
			>
				<FairySpriteComponent entity={fairyEntity} outfit={fairyOutfit} animated={false} />
			</TldrawUiToolbarToggleItem>
		</TldrawUiToolbarToggleGroup>
	)
}
