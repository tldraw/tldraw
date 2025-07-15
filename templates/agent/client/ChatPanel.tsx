import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { atom, Editor, useLocalStorageState, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, TLAgentModelName } from '../worker/models'
import { $chatHistoryItems, ChatHistory } from './ChatHistory'
import { useTldrawAiExample } from './useTldrawAiExample'

export const $eventSchedule = atom<any[]>('eventSchedule', [])

export function ChatPanel({ editor }: { editor: Editor }) {
	const ai = useTldrawAiExample(editor)

	const [isGenerating, setIsGenerating] = useState(false)
	const historyItems = useValue($chatHistoryItems)
	const rCancelFn = useRef<(() => void) | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const [modelName, setModelName] = useLocalStorageState<TLAgentModelName>(
		'model-name',
		'gemini-2.5-flash'
	)

	useEffect(() => {
		if (!editor) return
		;(window as any).editor = editor
		;(window as any).ai = ai
	}, [ai, editor])

	const checkSchedule = useCallback(async () => {
		const eventSchedule = $eventSchedule.get()

		if (!eventSchedule || eventSchedule.length === 0) {
			return // Base case - no more events to process
		}

		// Find the first scheduleReview event
		const reviewEventIndex = eventSchedule.findIndex(
			(item) =>
				item.type === 'agent-action' && // Correct type for scheduleReview
				item.action === 'scheduleReview'
		)

		if (reviewEventIndex === -1) {
			return // No review events found
		}

		const reviewEvent = eventSchedule[reviewEventIndex]
		const intent = (reviewEvent as any).info ?? (reviewEvent as any).intent ?? ''

		if (!intent) {
			// Remove event with no intent and continue
			$eventSchedule.update((prev) => prev.filter((_, i) => i !== reviewEventIndex))
			return checkSchedule() // Process next event
		}

		try {
			const review = ai.prompt({
				message: intent,
				stream: true,
				meta: { modelName, historyItems: $chatHistoryItems.get(), review: true },
			})
			rCancelFn.current = review.cancel
			await review.promise

			// Only remove the event after successful processing
			$eventSchedule.update((prev) => prev.filter((_, i) => i !== reviewEventIndex))

			// Process next event (if any) after a 1s timeout to allow for cancellation
			await checkSchedule()
		} catch (e) {
			console.error(e)
			setIsGenerating(false)
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
				return
			}

			// Otherwise, submit the user's message to the agent
			try {
				const formData = new FormData(e.currentTarget)
				const value = formData.get('input') as string

				if (inputRef.current) {
					inputRef.current.value = ''
				}

				$eventSchedule.set([])
				$chatHistoryItems.update((prev) => [
					...prev,
					{ type: 'user-message', message: value, status: 'done' },
				])

				const { promise, cancel } = ai.prompt({
					message: value,
					stream: true,
					meta: { modelName, historyItems: $chatHistoryItems.get() },
				})

				rCancelFn.current = cancel

				setIsGenerating(true)
				await promise

				// Do follow up steps if any have been scheduled
				await checkSchedule()

				setIsGenerating(false)
				rCancelFn.current = null
			} catch (e: any) {
				console.error(e)
				setIsGenerating(false)
				rCancelFn.current = null
			}
		},
		[ai, modelName, checkSchedule]
	)

	return (
		<div className="chat-panel">
			<div className="chat-header">
				<NewChatButton />
			</div>
			<ChatHistory editor={editor} items={historyItems} />
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

function NewChatButton() {
	return (
		<button className="new-chat-button" onClick={() => $chatHistoryItems.set([])}>
			+
		</button>
	)
}
