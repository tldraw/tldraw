import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Box, BoxModel, Editor, useToasts, useValue } from 'tldraw'
import { getSimpleContentFromCanvasContent } from '../../worker/simple/getSimpleContentFromCanvasContent'
import { $chatHistoryItems } from '../atoms/chatHistoryItems'
import { $contextItems, $pendingContextItems } from '../atoms/contextItems'
import { $modelName } from '../atoms/modelName'
import { $requestsSchedule } from '../atoms/requestsSchedule'
import { UserMessageHistoryItem } from '../types/ChatHistoryItem'
import { ContextItem } from '../types/ContextItem'
import { useTldrawAgent } from '../useTldrawAgent'
import { ChatHistory } from './chat-history/ChatHistory'
import { ChatInput } from './ChatInput'
import { $contextBoundsHighlight } from './highlights/ContextBoundsHighlights'

export function ChatPanel({ editor }: { editor: Editor }) {
	const ai = useTldrawAgent(editor)
	const [isGenerating, setIsGenerating] = useState(false)
	const rCancelFn = useRef<(() => void) | null>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const modelName = useValue('modelName', () => $modelName.get(), [$modelName])

	useEffect(() => {
		if (!editor) return
		;(window as any).editor = editor
		;(window as any).ai = ai
	}, [ai, editor])

	const toast = useToasts()

	const processSchedule = useCallback(async () => {
		// Process all requests in the schedule sequentially
		while (true) {
			const eventSchedule = $requestsSchedule.get()

			if (!eventSchedule || eventSchedule.length === 0) {
				return // Base case - no more events to process
			}

			// The next scheduled request
			const request = eventSchedule[0]
			const intent = request.message

			$pendingContextItems.set(request.contextItems)
			const bounds = Box.From(request.bounds)

			$contextBoundsHighlight.set(bounds)

			try {
				const { promise, cancel } = ai.prompt({
					message: intent,
					stream: true,
					contextBounds: bounds,
					promptBounds: bounds,
					meta: {
						modelName,
						historyItems: $chatHistoryItems.get().filter((item) => item.type !== 'status-thinking'),
						contextItems: getSimpleContextItemsFromContextItems(request.contextItems),
						currentPageShapes: editor.getCurrentPageShapesSorted().map((v) => ({ ...v })),
						currentUserViewportBounds: editor.getViewportPageBounds(),
						type: request.type,
					},
				})

				$chatHistoryItems.update((prev) => [
					...prev,
					{
						type: 'status-thinking',
						message: request.type === 'review' ? 'Reviewing' : 'Generating', //TODO handle this more gracefully once we have more scheduled requests
						status: 'progress',
					},
				])

				rCancelFn.current = cancel
				await promise

				// Only remove the event after successful processing
				$requestsSchedule.update((prev) => prev.filter((_, i) => i !== 0))

				// Set previous status-thinking to done
				// this assume only one status-thinking at a time. not a bad assumption for now?
				$chatHistoryItems.update((prev) => {
					const lastStatusThinkingIndex = [...prev]
						.reverse()
						.findIndex((item) => item.type === 'status-thinking' && item.status === 'progress')
					if (lastStatusThinkingIndex === -1) return prev
					const idx = prev.length - 1 - lastStatusThinkingIndex
					return prev.map((item, i) => (i === idx ? { ...item, status: 'done' } : item))
				})

				rCancelFn.current = null
			} catch (e) {
				toast.addToast({
					title: 'Error',
					description: e instanceof Error ? e.message : 'An error occurred',
					severity: 'error',
				})
				rCancelFn.current = null
				// Remove the failed request from the schedule
				$requestsSchedule.update((prev) => prev.filter((_, i) => i !== 0))
				// Continue processing the next request
				console.error(e)
			}
		}
	}, [ai, modelName, editor, toast])

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

				$requestsSchedule.set([])
				$pendingContextItems.set([])
				$chatHistoryItems.update((prev) =>
					prev.map((item) => (item.status === 'progress' ? { ...item, status: 'cancelled' } : item))
				)
			}

			// If the user's message is empty, do nothing
			if (value === '') return

			// Submit the user's message to the agent
			if (inputRef.current) inputRef.current.value = ''

			const userMessageHistoryItem: UserMessageHistoryItem = {
				type: 'user-message',
				message: value,
				status: 'done',
				contextItems: $contextItems.get(),
			}

			$pendingContextItems.set(userMessageHistoryItem.contextItems)
			$contextItems.set([])
			$chatHistoryItems.update((prev) => [...prev, userMessageHistoryItem])

			// TODO once we implement letting the agent move, we can get those bounds and lock them here instead of using the viewport
			const intitialBounds = editor.getViewportPageBounds()

			$requestsSchedule.update((prev) => [
				...prev,
				{
					message: userMessageHistoryItem.message,
					contextItems: userMessageHistoryItem.contextItems,
					type: 'user',
					bounds: intitialBounds,
				},
			])

			$contextBoundsHighlight.set(intitialBounds)

			setIsGenerating(true)
			await processSchedule()
			setIsGenerating(false)

			$pendingContextItems.set([])
			$contextBoundsHighlight.set(null)
		},
		[processSchedule, editor]
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
		$requestsSchedule.set([])
		$contextBoundsHighlight.set(null)
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
			<ChatHistory editor={editor} />
			<ChatInput
				handleSubmit={handleSubmit}
				inputRef={inputRef}
				isGenerating={isGenerating}
				editor={editor}
			/>
		</div>
	)
}

function getSimpleContextItemsFromContextItems(contextItems: ContextItem[]) {
	const shapeContextItems = contextItems.filter((item) => item.type === 'shape')
	const areaContextItems = contextItems.filter((item) => item.type === 'area')
	const pointContextItems = contextItems.filter((item) => item.type === 'point')

	const simpleContent = getSimpleContentFromCanvasContent({
		shapes: shapeContextItems.map((item) => item.shape),
		bindings: [],
		assets: [],
	})

	return {
		shapes: simpleContent.shapes,
		areas: areaContextItems.map((area) => roundBox(area.bounds)),
		points: pointContextItems.map((point) => point.point),
	}
}

function roundBox(box: BoxModel) {
	const b = { ...box }
	b.x = Math.round(b.x)
	b.y = Math.round(b.y)
	b.w = Math.round(b.w)
	b.h = Math.round(b.h)
	return b
}
