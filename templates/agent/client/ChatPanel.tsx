import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor, useLocalStorageState } from 'tldraw'
import { DEFAULT_MODEL_NAME, TLAgentModelName } from '../worker/models'
import { $chatHistoryItems, ChatHistory } from './ChatHistory'
import { UserMessageHistoryItem } from './ChatHistoryItem'
import { ChatInput } from './ChatInput'
import { $contextItems, $pendingContextItems, getSimpleContextFromContextItems } from './Context'
import { $requestsSchedule } from './requestsSchedule'
import { useTldrawAiExample } from './useTldrawAiExample'

export function ChatPanel({ editor }: { editor: Editor }) {
	const ai = useTldrawAiExample(editor)

	const [isGenerating, setIsGenerating] = useState(false)
	const rCancelFn = useRef<(() => void) | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const [modelName] = useLocalStorageState<TLAgentModelName>('model-name', DEFAULT_MODEL_NAME)

	useEffect(() => {
		if (!editor) return
		;(window as any).editor = editor
		;(window as any).ai = ai
	}, [ai, editor])

	const advanceSchedule = useCallback(async () => {
		const eventSchedule = $requestsSchedule.get()

		if (!eventSchedule || eventSchedule.length === 0) {
			return // Base case - no more events to process
		}

		// The next scheduled request
		const request = eventSchedule[0]
		const intent = request.message

		try {
			const { promise, cancel } = ai.prompt({
				message: intent,
				stream: true,
				meta: {
					modelName,
					historyItems: $chatHistoryItems.get().filter((item) => item.type !== 'status-thinking'),
					// TODO: Add first-class support to handle custom-specified shapes/viewports/etc.
					// Note: Right now this is not applying our transforms
					context: getSimpleContextFromContextItems(request.contextItems),
					review: request.review,
				},
			})

			$chatHistoryItems.update((prev) => [
				...prev,
				{
					type: 'status-thinking',
					message: request.review ? 'Reviewing' : 'Generating',
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

			// Process next event (if any)
			await advanceSchedule()
			rCancelFn.current = null
		} catch (e) {
			console.error(e)
			rCancelFn.current = null
		}
	}, [ai, modelName])

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()

			// If we have a stashed cancel function, call it and stop here
			if (rCancelFn.current) {
				rCancelFn.current()
				rCancelFn.current = null
				setIsGenerating(false)

				$requestsSchedule.set([])
				$pendingContextItems.set([])
				$chatHistoryItems.update((prev) =>
					prev.map((item) => (item.status === 'progress' ? { ...item, status: 'cancelled' } : item))
				)

				return
			}

			// Otherwise, submit the user's message to the agent
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string
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
			$requestsSchedule.update((prev) => [
				...prev,
				{
					message: userMessageHistoryItem.message,
					contextItems: userMessageHistoryItem.contextItems,
					review: false,
				},
			])

			setIsGenerating(true)
			await advanceSchedule()
			setIsGenerating(false)
			$pendingContextItems.set([])
		},
		[advanceSchedule]
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
