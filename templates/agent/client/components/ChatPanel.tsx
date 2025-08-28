import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor, useToasts, useValue } from 'tldraw'
import { convertTldrawShapeToSimpleShape } from '../../shared/format/SimpleShape'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { advanceSchedule } from '../ai/advanceSchedule'
import { useTldrawAgent } from '../ai/useTldrawAgent'
import { $agentViewportBoundsHighlight } from '../atoms/agentViewportBoundsHighlight'
import { $chatHistoryItems } from '../atoms/chatHistoryItems'
import { $contextItems, $pendingContextItems } from '../atoms/contextItems'
import { $documentChanges, recordDocumentChanges } from '../atoms/documentChanges'
import { $modelName } from '../atoms/modelName'
import { $todoItems } from '../atoms/todoItems'
import { ChatHistory } from './chat-history/ChatHistory'
import { ChatInput } from './ChatInput'
import { TodoList } from './TodoList'

export function ChatPanel({ editor }: { editor: Editor }) {
	const agent = useTldrawAgent(editor)

	const [isGenerating, setIsGenerating] = useState(false)
	const rCancelFn = useRef<(() => void) | null>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const toast = useToasts()
	const modelName = useValue('modelName', () => $modelName.get(), [$modelName])

	const handleError = useCallback(
		(e: any) => {
			const message = typeof e === 'string' ? e : e instanceof Error && e.message
			toast.addToast({
				title: 'Error',
				description: message || 'An error occurred',
				severity: 'error',
			})
			console.error(e)
		},
		[toast]
	)

	useEffect(() => {
		if (!editor) return
		;(window as any).editor = editor
		;(window as any).agent = agent
	}, [agent, editor])

	useEffect(() => {
		if (!editor) return
		const cleanUp = recordDocumentChanges(editor)
		return () => cleanUp()
	}, [editor])

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string

			// If we're currently generating, interrupt the current request
			if (rCancelFn.current) {
				rCancelFn.current()
				rCancelFn.current = null

				$agentViewportBoundsHighlight.set(null)
				$pendingContextItems.set([])
				setIsGenerating(false)
			}

			// If the user's message is empty, do nothing
			if (value === '') return
			if (inputRef.current) inputRef.current.value = ''

			// If every todo item is done, clear the todo list
			$todoItems.update((items) => {
				if (items.every((item) => item.status === 'done')) {
					return []
				}
				return items
			})

			const promptHistoryItem: IChatHistoryItem = {
				type: 'prompt',
				message: value,
				contextItems: $contextItems.get(),
				selectedShapes: editor
					.getSelectedShapes()
					.map((shape) => convertTldrawShapeToSimpleShape(shape, editor)),
			}

			$pendingContextItems.set(promptHistoryItem.contextItems)
			$contextItems.set([])
			$chatHistoryItems.update((prev) => [...prev, promptHistoryItem])
			setIsGenerating(true)
			const request: AgentRequest = {
				message: promptHistoryItem.message,
				contextItems: promptHistoryItem.contextItems,
				bounds: editor.getViewportPageBounds(),
				modelName,
				type: 'user',
			}

			const { promise, cancel } = advanceSchedule({ agent, request, onError: handleError })
			rCancelFn.current = cancel
			await promise
			rCancelFn.current = null

			setIsGenerating(false)

			// TODO
			// right now, we clear the changes when the agent finishes its turn. However, this loses all the changes that happened while the agent was working. We should make this more sophisticated.
			$documentChanges.set(editor, [])

			$pendingContextItems.set([])
			$agentViewportBoundsHighlight.set(null)
		},
		[agent, modelName, editor, rCancelFn, handleError]
	)

	function handleNewChat() {
		if (rCancelFn.current) {
			rCancelFn.current()
			rCancelFn.current = null
		}

		setIsGenerating(false)
		$chatHistoryItems.set([])
		$pendingContextItems.set([])
		$contextItems.set([])
		$agentViewportBoundsHighlight.set(null)
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
