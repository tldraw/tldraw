import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor, useLocalStorageState, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, TLAgentModelName } from '../worker/models'
import { $chatHistoryItems, ChatHistory } from './ChatHistory'
import { useTldrawAiExample } from './useTldrawAiExample'

// TODO: Move this to the worker
const REVIEW_PROMPT = `Examine the actions that you (the agent) took since the most recent user message. What's next?

- Are you awaiting a response from the user? If so, there's no need to do or say anything.
- Is the task supposed to be complete? If so, it's time to review the results of that. Did you do what the user asked for? Did the plan work? Think through your findings and pay close attention to the screenshot because that's what the user sees. If you make any corrections, let the user know what you did and why. If no corrections are needed, there's no need to say anything.`

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

				// Hardcoded (for now) review step
				const review = ai.prompt({
					message: REVIEW_PROMPT,
					stream: true,
					meta: { modelName, historyItems: $chatHistoryItems.get() },
				})

				rCancelFn.current = review.cancel
				await review.promise

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
