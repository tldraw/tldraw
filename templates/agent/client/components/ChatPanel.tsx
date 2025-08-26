import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor, useToasts, useValue } from 'tldraw'
import { EVENT_UTILS, PROMPT_PART_UTILS } from '../../shared/AgentUtils'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { advanceSchedule } from '../ai/advanceSchedule'
import { useTldrawAgent } from '../ai/useTldrawAgent'
import { $agentHistoryItems } from '../atoms/agentHistoryItems'
import { $contextItems, $pendingContextItems } from '../atoms/contextItems'
import { $modelName } from '../atoms/modelName'
import { $scheduledRequests } from '../atoms/scheduledRequests'
import { $todoItems } from '../atoms/todoItems'
import { ChatHistory } from './chat-history/ChatHistory'
import { ChatInput } from './ChatInput'
import { $contextBoundsHighlight } from './highlights/ContextBoundsHighlights'
import { TodoList } from './TodoList'

export function ChatPanel({ editor }: { editor: Editor }) {
	const agent = useTldrawAgent({ editor, partUtils: PROMPT_PART_UTILS, eventUtils: EVENT_UTILS })

	const [isGenerating, setIsGenerating] = useState(false)
	const rCancelFn = useRef<(() => void) | null>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const toast = useToasts()
	const modelName = useValue('modelName', () => $modelName.get(), [$modelName])

	useEffect(() => {
		if (!editor) return
		;(window as any).editor = editor
		;(window as any).agent = agent
	}, [agent, editor])

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string

			// If we're currently generating, cancel the current request and send the new one instead
			if (rCancelFn.current) {
				rCancelFn.current()
				rCancelFn.current = null

				$contextBoundsHighlight.set(null)

				$scheduledRequests.set([])
				$pendingContextItems.set([])
			}

			// If every todo item is done, clear the todo list
			$todoItems.update((items) => {
				if (items.every((item) => item.status === 'done')) {
					return []
				}
				return items
			})

			// If the user's message is empty, do nothing
			if (value === '') return
			if (inputRef.current) inputRef.current.value = ''

			const promptHistoryItem: IChatHistoryItem = {
				type: 'prompt',
				message: value,
				contextItems: $contextItems.get(),
			}

			$pendingContextItems.set(promptHistoryItem.contextItems)
			$contextItems.set([])
			$agentHistoryItems.update((prev) => [...prev, promptHistoryItem])

			const intitialBounds = editor.getViewportPageBounds()

			$scheduledRequests.update((prev) => [
				...prev,
				{
					message: promptHistoryItem.message,
					contextItems: promptHistoryItem.contextItems,
					type: 'user',
					bounds: intitialBounds,
				},
			])

			$contextBoundsHighlight.set(intitialBounds)

			setIsGenerating(true)
			try {
				await advanceSchedule({ editor, modelName, agent, rCancelFn })
			} catch (e) {
				const message = typeof e === 'string' ? e : e instanceof Error && e.message
				toast.addToast({
					title: 'Error',
					description: message || 'An error occurred',
					severity: 'error',
				})
				console.error(e)
			}
			setIsGenerating(false)

			$pendingContextItems.set([])
			$contextBoundsHighlight.set(null)
		},
		[agent, modelName, editor, rCancelFn, toast]
	)

	function handleNewChat() {
		if (rCancelFn.current) {
			rCancelFn.current()
			rCancelFn.current = null
		}

		setIsGenerating(false)
		$agentHistoryItems.set([])
		$pendingContextItems.set([])
		$contextItems.set([])
		$scheduledRequests.set([])
		$contextBoundsHighlight.set(null)
		$todoItems.set([])
	}

	function NewChatButton() {
		return (
			<button className="new-chat-button" onClick={handleNewChat}>
				+
			</button>
		)
	}

	return (
		<div className="chat-panel tl-theme__dark">
			<div className="chat-header">
				<NewChatButton />
			</div>
			<ChatHistory editor={editor} agent={agent} isGenerating={isGenerating} />
			<TodoList />
			<ChatInput
				handleSubmit={handleSubmit}
				inputRef={inputRef}
				isGenerating={isGenerating}
				editor={editor}
			/>
		</div>
	)
}
