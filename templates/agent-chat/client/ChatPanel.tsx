import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, TLAgentModelName } from '../worker/models'
import { ChatHistory } from './ChatHistory'
import { useChatHistory } from './ChatHistoryContext'
import { useTldrawAiExample } from './useTldrawAiExample'

export function ChatPanel({ editor }: { editor: Editor }) {
	const ai = useTldrawAiExample(editor)

	const [isGenerating, setIsGenerating] = useState(false)
	const [historyItems, setHistoryItems] = useChatHistory()
	const rCancelFn = useRef<(() => void) | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const [modelName, setModelName] = useState<TLAgentModelName>('gpt-4o')

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

				// Faking this for now
				setHistoryItems((prev) => {
					const lastItem = prev[prev.length - 1]
					if (lastItem.type === 'agent-action') {
						return [...prev.slice(0, -1), { ...lastItem, status: 'cancelled' }]
					}
					return prev
				})
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

				setHistoryItems((prev) => [
					...prev,
					{ type: 'user-message', message: value },
					{ type: 'agent-action', action: 'editing', status: 'progress' },
				])

				const { promise, cancel } = ai.prompt({
					message: value,
					stream: true,
					meta: { modelName },
				})

				rCancelFn.current = cancel
				setIsGenerating(true)
				await promise

				// Faking this for now
				setHistoryItems((prev) => {
					const lastItem = prev[prev.length - 1]
					if (lastItem.type === 'agent-action') {
						return [...prev.slice(0, -1), { ...lastItem, status: 'done' }]
					}
					return prev
				})

				setIsGenerating(false)
				rCancelFn.current = null
			} catch (e: any) {
				console.error(e)
				setIsGenerating(false)
				rCancelFn.current = null
			}
		},
		[ai, modelName, setHistoryItems]
	)

	return (
		<div className="chat-panel">
			<ChatHistory items={historyItems} />
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
