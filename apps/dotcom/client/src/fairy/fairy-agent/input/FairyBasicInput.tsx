import { convertTldrawShapeToSimpleShape } from '@tldraw/dotcom-shared'
import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { useValue } from 'tldraw'
import { TldrawFairyAgent } from '../agent/TldrawFairyAgent'

export function FairyBasicInput({ agent }: { agent: TldrawFairyAgent }) {
	const { editor } = agent
	const inputRef = useRef<HTMLInputElement>(null)
	const [inputValue, setInputValue] = useState('')
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])
	const modelName = useValue(agent.$modelName)

	// Auto-focus the input when the component mounts
	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()
			if (!inputRef.current) return
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string

			// If the user's message is empty, just cancel the current request (if there is one)
			if (value === '') {
				agent.cancel()
				return
			}

			// Grab the user query and clear the chat input
			const message = value
			inputRef.current.value = ''
			setInputValue('')

			// Prompt the agent
			const selectedShapes = editor
				.getSelectedShapes()
				.map((shape) => convertTldrawShapeToSimpleShape(editor, shape))

			await agent.prompt({
				message,
				contextItems: [],
				bounds: editor.getViewportPageBounds(),
				modelName,
				selectedShapes,
				type: 'user',
			})
		},
		[agent, modelName, editor]
	)

	return (
		<div className="fairy-input">
			<form onSubmit={handleSubmit} className="fairy-input__form">
				<input
					ref={inputRef}
					name="input"
					type="text"
					autoComplete="off"
					placeholder={`Ask ${agent.id}...`}
					value={inputValue}
					onInput={(e) => setInputValue(e.currentTarget.value)}
					className="fairy-input__field"
				/>
				<button
					type="submit"
					disabled={inputValue === '' && !isGenerating}
					className="fairy-input__submit"
					title={isGenerating && inputValue === '' ? 'Stop' : 'Send'}
				>
					{isGenerating && inputValue === '' ? '◼' : '⬆'}
				</button>
			</form>
		</div>
	)
}
