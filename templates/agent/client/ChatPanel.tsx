import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor, useLocalStorageState, useReactor, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, TLAgentModelName } from '../worker/models'
import { $chatHistoryItems, ChatHistory } from './ChatHistory'
import { $requestsSchedule } from './requestsSchedule'
import { useTldrawAiExample } from './useTldrawAiExample'

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

	useEffect(() => {
		const localHistoryItems = localStorage.getItem('chat-history-items')
		if (localHistoryItems) {
			try {
				$chatHistoryItems.set(JSON.parse(localHistoryItems))
			} catch (e) {
				console.error(e)
			}
		}
	}, [])

	useReactor(
		'stash locally',
		() => {
			localStorage.setItem('chat-history-items', JSON.stringify($chatHistoryItems.get()))
		},
		[$chatHistoryItems]
	)

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
				meta: { modelName, historyItems: $chatHistoryItems.get(), review: request.review },
			})
			rCancelFn.current = cancel
			await promise

			// Only remove the event after successful processing
			$requestsSchedule.update((prev) => prev.filter((_, i) => i !== 0))

			// Process next event (if any) after a 1s timeout to allow for cancellation
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
				return
			}

			// Otherwise, submit the user's message to the agent
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string

			if (inputRef.current) {
				inputRef.current.value = ''
			}

			$chatHistoryItems.update((prev) => [
				...prev,
				{ type: 'user-message', message: value, status: 'done' },
			])

			$requestsSchedule.update((prev) => [...prev, { message: value, review: false }])

			setIsGenerating(true)
			await advanceSchedule()
			setIsGenerating(false)
		},
		[advanceSchedule]
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
