import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, TLAgentModelName } from '../worker/models'
import { useTldrawAiExample } from './useTldrawAiExample'

export function ChatPanel({ editor }: { editor: Editor }) {
	const ai = useTldrawAiExample(editor)

	const [isGenerating, setIsGenerating] = useState(false)
	const [historyItems, setHistoryItems] = useState<ChatHistoryItem[]>([])
	const rCancelFn = useRef<(() => void) | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const [modelName, setModelName] = useState<TLAgentModelName>('claude-4-sonnet')

	useEffect(() => {
		if (!editor) return
		;(window as any).editor = editor
		;(window as any).ai = ai
	}, [ai, editor])

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()

			// If we have a stashed cancel function, call it and stop here
			if (rCancelFn.current) {
				rCancelFn.current()
				rCancelFn.current = null

				// Faking this for now
				setHistoryItems((prev) => {
					const lastItem = prev[prev.length - 1]
					if (lastItem.type === 'agent-action') {
						return [...prev.slice(0, -1), { ...lastItem, status: 'cancelled' }]
					}
					return prev
				})
				setIsGenerating(false)
				return
			}

			// Otherwise, submit the user's message to the agent
			try {
				const formData = new FormData(e.currentTarget)
				const value = formData.get('input') as string

				if (inputRef.current) {
					inputRef.current.value = ''
				}

				setHistoryItems((prev) => [
					...prev,
					{ type: 'user-message', message: value },
					{ type: 'agent-action', action: 'editing', status: 'progress' },
				])

				const { promise, cancel } = ai.prompt({
					message: value,
					stream: true,
					meta: { modelName },
				})

				rCancelFn.current = cancel
				setIsGenerating(true)
				await promise

				// Faking this for now
				setHistoryItems((prev) => {
					const lastItem = prev[prev.length - 1]
					if (lastItem.type === 'agent-action') {
						return [...prev.slice(0, -1), { ...lastItem, status: 'done' }]
					}
					return prev
				})

				setIsGenerating(false)
				rCancelFn.current = null
			} catch (e: any) {
				console.error(e)
				setIsGenerating(false)
				rCancelFn.current = null
			}
		},
		[ai, modelName]
	)

	return (
		<div className="chat-panel">
			<ChatHistory items={historyItems} />
			<div className="chat-input">
				<form onSubmit={handleSubmit}>
					<input
						ref={inputRef}
						name="input"
						type="text"
						autoComplete="off"
						placeholder="Speak to your agent..."
					/>
					<span className="chat-input-actions">
						<select
							value={modelName}
							onChange={(e) => setModelName(e.target.value as TLAgentModelName)}
						>
							{Object.values(AGENT_MODEL_DEFINITIONS).map((model) => (
								<option key={model.name} value={model.name}>
									{model.name}
								</option>
							))}
						</select>
						<button>{isGenerating ? '◼' : '⬆'}</button>
					</span>
				</form>
			</div>
		</div>
	)
}

type ChatHistoryItem =
	| UserMessageHistoryItem
	| AgentMessageHistoryItem
	| AgentChangeHistoryItem
	| AgentActionHistoryItem

interface UserMessageHistoryItem {
	type: 'user-message'
	message: string
}

interface AgentMessageHistoryItem {
	type: 'agent-message'
	message: string
}

interface AgentActionHistoryItem {
	type: 'agent-action'
	action: 'editing'
	status: 'progress' | 'done' | 'cancelled'
}

interface AgentChangeHistoryItem {
	type: 'agent-change'
	change: string
}

function UserMessageHistoryItem({ item }: { item: UserMessageHistoryItem }) {
	return <div className="user-chat-message">{item.message}</div>
}

function AgentMessageHistoryItem({ item }: { item: AgentMessageHistoryItem }) {
	return <div className="agent-chat-message">{item.message}</div>
}

function AgentChangeHistoryItem({ item }: { item: AgentChangeHistoryItem }) {
	return <div className="agent-change-message">{item.change}</div>
}

function AgentActionHistoryItem({ item }: { item: AgentActionHistoryItem }) {
	const actionDefinition = ACTION_HISTORY_ITEMS[item.action]

	const icon = actionDefinition.icon

	const message = actionDefinition.message[item.status]

	return (
		<div className="agent-action-message">
			<span>{icon}</span>
			<span>{message}</span>
		</div>
	)
}

interface AgentActionDefinition {
	icon: string
	message: { progress: string; done: string; cancelled: string }
}

const ACTION_HISTORY_ITEMS: Record<AgentActionHistoryItem['action'], AgentActionDefinition> = {
	editing: {
		icon: '✏️',
		message: {
			progress: 'Editing the board...',
			done: 'Edited the board.',
			cancelled: 'Edits cancelled.',
		},
	},
}

function ChatHistory({ items }: { items: ChatHistoryItem[] }) {
	return (
		<div className="chat-history">
			{items.map((item, index) => {
				switch (item.type) {
					case 'user-message':
						return <UserMessageHistoryItem key={index} item={item} />
					case 'agent-message':
						return <AgentMessageHistoryItem key={index} item={item} />
					case 'agent-change':
						return <AgentChangeHistoryItem key={index} item={item} />
					case 'agent-action':
						return <AgentActionHistoryItem key={index} item={item} />
				}
			})}
		</div>
	)
}
