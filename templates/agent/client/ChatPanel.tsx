import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor, useLocalStorageState, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, TLAgentModelName } from '../worker/models'
import { $chatHistoryItems, ChatHistory } from './ChatHistory'
import { $eventSchedule, useTldrawAiExample } from './useTldrawAiExample'

// TODO: Move this to the worker
function getReviewPrompt(intent: string) {
	return `Examine the actions that you (the agent) took since the most recent user message, with the intent: "${intent}". What's next?

- Are you awaiting a response from the user? If so, there's no need to do or say anything.
- Is the task supposed to be complete? If so, it's time to review the results of that. Did you do what the user asked for? Did the plan work? Think through your findings and pay close attention to the screenshot because that's what the user sees. If you make any corrections, let the user know what you did and why. If no corrections are needed, there's no need to say anything.`
}

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

	async function checkSchedule() {
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
			const reviewPrompt = getReviewPrompt(intent)
			const review = ai.prompt({
				message: reviewPrompt,
				stream: true,
				meta: { modelName, historyItems: $chatHistoryItems.get() },
			})
			rCancelFn.current = review.cancel
			await review.promise

			// Only remove the event after successful processing
			$eventSchedule.update((prev) => prev.filter((_, i) => i !== reviewEventIndex))

			// Process next event (if any) after a 1s timeout to allow for cancellation
			checkSchedule()
		} catch (error) {
			// Don't remove the event on failure - let it be retried
			return
		}
	}

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

				checkSchedule()

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
