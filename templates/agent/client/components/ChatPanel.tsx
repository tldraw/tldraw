import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor, useToasts, useValue } from 'tldraw'
import { EVENT_UTILS, PROMPT_PART_UTILS } from '../../shared/AgentUtils'
import { AgentHistoryItem } from '../../shared/types/AgentHistoryItem'
import { advanceSchedule } from '../ai/advanceSchedule'
import { useTldrawAgent } from '../ai/useTldrawAgent'
import { $agentHistoryItems } from '../atoms/agentHistoryItems'
import { $contextItems, $pendingContextItems } from '../atoms/contextItems'
import { $modelName } from '../atoms/modelName'
import { $scheduledRequests } from '../atoms/scheduledRequests'
import { $todoItems } from '../atoms/todoItems'
import { AgentHistory } from './chat-history/AgentHistory'
import { ChatInput } from './ChatInput'
import { $contextBoundsHighlight } from './highlights/ContextBoundsHighlights'

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

			// Otherwise, submit the user's message to the agent
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string

			// If we're currently generating, cancel the current request and send the new one instead
			if (rCancelFn.current) {
				rCancelFn.current()
				rCancelFn.current = null
				setIsGenerating(false)

				$contextBoundsHighlight.set(null)

				$scheduledRequests.set([])
				$pendingContextItems.set([])
				$agentHistoryItems.update((prev) =>
					prev.map((item) => (item.status === 'progress' ? { ...item, status: 'cancelled' } : item))
				)
			}

			// If the user's message is empty, do nothing
			if (value === '') return

			// Submit the user's message to the agent
			if (inputRef.current) inputRef.current.value = ''

			const promptHistoryItem: AgentHistoryItem = {
				type: 'prompt',
				message: value,
				status: 'done',
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
		<div className="chat-panel tl-container tl-theme__dark">
			<div className="chat-header">
				<NewChatButton />
			</div>
			<AgentHistory editor={editor} agent={agent} isGenerating={isGenerating} />
			<ChatInput
				handleSubmit={handleSubmit}
				inputRef={inputRef}
				isGenerating={isGenerating}
				editor={editor}
			/>
		</div>
	)
}
