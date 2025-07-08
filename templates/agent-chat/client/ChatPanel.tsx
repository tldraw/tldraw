import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from 'tldraw'
import { useTldrawAiExample } from './useTldrawAiExample'

export function ChatPanel({ editor }: { editor: Editor }) {
	const ai = useTldrawAiExample(editor)

	// The state of the prompt input, either idle or loading with a cancel callback
	const [isGenerating, setIsGenerating] = useState(false)

	// A stashed cancel function that we can call if the user clicks the button while loading
	const rCancelFn = useRef<(() => void) | null>(null)

	// Put the editor and ai helpers onto the window for debugging. You can run commands like `ai.prompt('draw a unicorn')` in the console.
	useEffect(() => {
		if (!editor) return
		;(window as any).editor = editor
		;(window as any).ai = ai
	}, [ai, editor])

	const [historyItems, setHistoryItems] = useState<ChatHistoryItem[]>([])

	const inputRef = useRef<HTMLInputElement>(null)

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()

			// If we have a stashed cancel function, call it and stop here
			if (rCancelFn.current) {
				rCancelFn.current()
				rCancelFn.current = null
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

			try {
				const formData = new FormData(e.currentTarget)
				const value = formData.get('input') as string

				if (inputRef.current) {
					inputRef.current.value = ''
				}

				setHistoryItems((prev) => [
					...prev,
					{ type: 'user-message', message: value },
					{ type: 'agent-action', action: 'thinking', status: 'progress' },
				])

				// We call the ai module with the value from the input field and get back a promise and a cancel function
				const { promise, cancel } = ai.prompt({ message: value, stream: true })

				// Stash the cancel function so we can call it if the user clicks the button again
				rCancelFn.current = cancel

				// Set the state to loading
				setIsGenerating(true)

				// ...wait for the promise to resolve
				await promise

				setHistoryItems((prev) => {
					const lastItem = prev[prev.length - 1]
					if (lastItem.type === 'agent-action') {
						return [...prev.slice(0, -1), { ...lastItem, status: 'done' }]
					}
					return prev
				})

				// ...then set the state back to idle
				setIsGenerating(false)
				rCancelFn.current = null
			} catch (e: any) {
				console.error(e)
				setIsGenerating(false)
				rCancelFn.current = null
			}
		},
		[ai]
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
					<button>{isGenerating ? '◼' : '⬆'}</button>
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
	action: 'thinking'
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

	const icon =
		item.status === 'done' ? '✅' : item.status === 'cancelled' ? '❌' : actionDefinition.icon

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
	thinking: {
		icon: '🧠',
		message: {
			progress: 'Thinking...',
			done: 'Thoughts complete.',
			cancelled: 'Thoughts cancelled.',
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
