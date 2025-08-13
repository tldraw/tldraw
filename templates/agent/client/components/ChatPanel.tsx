import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor, useToasts, useValue } from 'tldraw'
import { useAgent } from '../ai/useAgent'
import { $chatHistoryItems } from '../atoms/chatHistoryItems'
import { $contextItems, $pendingContextItems } from '../atoms/contextItems'
import { $modelName } from '../atoms/modelName'
import { $requestsSchedule } from '../atoms/requestsSchedule'
import { AlignEventUtil } from '../events/AlignEventUtil'
import { CreateEventUtil } from '../events/CreateEventUtil'
import { DeleteEventUtil } from '../events/DeleteEventUtil'
import { DistributeEventUtil } from '../events/DistributeEventUtil'
import { LabelEventUtil } from '../events/LabelEventUtil'
import { MessageEventUtil } from '../events/MessageEventUtil'
import { MoveEventUtil } from '../events/MoveEventUtil'
import { PlaceEventUtil } from '../events/PlaceEventUtil'
import { ReviewEventUtil } from '../events/ReviewEventUtil'
import { SetMyViewEventUtil } from '../events/SetMyViewEventUtil'
import { StackEventUtil } from '../events/StackEventUtil'
import { ThinkEventUtil } from '../events/ThinkEventUtil'
import { UpdateEventUtil } from '../events/UpdateEventUtil'
import { processSchedule } from '../processSchedule'
import { AgentViewportScreenshotPartUtil } from '../promptParts/AgentViewportScreenshotPartUtil'
import { AgentViewportShapesPartUtil } from '../promptParts/AgentViewportShapesPartUtil'
import { ContextBoundsPartUtil } from '../promptParts/ContextBoundsPartUtil'
import { ContextItemsPartUtil } from '../promptParts/ContextItemsPartUtil'
import { CurrentUserViewportBoundsPartUtil } from '../promptParts/CurrentUserViewportBoundsPartUtil'
import { HistoryItemPartUtil } from '../promptParts/HistoryItemPartUtil'
import { MessagePartUtil } from '../promptParts/MessagePartUtil'
import { PeripheralContentPartUtil } from '../promptParts/PeripheralContentPartUtil'
import { PromptBoundsPartUtil } from '../promptParts/PromptBoundsPartUtil'
import { UserSelectedShapesPartUtil } from '../promptParts/UserSelectedShapesPartUtil'
import { AgentHistory } from './chat-history/AgentHistory'
import { PromptHistoryItem } from './chat-history/AgentHistoryItem'
import { ChatInput } from './ChatInput'
import { $contextBoundsHighlight } from './highlights/ContextBoundsHighlights'

export function ChatPanel({ editor }: { editor: Editor }) {
	const agent = useAgent({
		editor,
		promptPartUtils: [
			AgentViewportScreenshotPartUtil,
			AgentViewportShapesPartUtil,
			ContextBoundsPartUtil,
			ContextItemsPartUtil,
			CurrentUserViewportBoundsPartUtil,
			HistoryItemPartUtil,
			MessagePartUtil,
			PeripheralContentPartUtil,
			PromptBoundsPartUtil,
			UserSelectedShapesPartUtil,
		],
		eventUtils: [
			UpdateEventUtil,
			DeleteEventUtil,
			CreateEventUtil,
			MoveEventUtil,
			PlaceEventUtil,
			StackEventUtil,
			AlignEventUtil,
			ReviewEventUtil,
			SetMyViewEventUtil,
			DistributeEventUtil,
			LabelEventUtil,
			ThinkEventUtil,
			MessageEventUtil,
		],
	})

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

			const promptHistoryItem: PromptHistoryItem = {
				type: 'prompt',
				message: value,
				status: 'done',
				contextItems: $contextItems.get(),
			}

			$pendingContextItems.set(promptHistoryItem.contextItems)
			$contextItems.set([])
			$chatHistoryItems.update((prev) => [...prev, promptHistoryItem])

			// TODO once we implement letting the agent move, we can get those bounds and lock them here instead of using the viewport
			const intitialBounds = editor.getViewportPageBounds()

			$requestsSchedule.update((prev) => [
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
				await processSchedule({ editor, modelName, agent, rCancelFn })
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
