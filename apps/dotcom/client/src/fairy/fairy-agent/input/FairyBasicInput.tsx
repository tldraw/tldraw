import { convertTldrawShapeToFocusedShape, DEFAULT_FAIRY_VISION } from '@tldraw/dotcom-shared'
import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Box, useValue } from 'tldraw'
import { TldrawFairyAgent } from '../agent/TldrawFairyAgent'
import { FairyInputButton } from './FairyInputButton'

export function FairyBasicInput({ agent }: { agent: TldrawFairyAgent }) {
	const { editor } = agent
	const inputRef = useRef<HTMLInputElement>(null)
	const [inputValue, setInputValue] = useState('')
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])
	const modelName = useValue(agent.$modelName)

	const fairy = useValue('fairy', () => agent.$fairy, [agent])

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
				.map((shape) => convertTldrawShapeToFocusedShape(editor, shape))

			const fairyPosition = fairy.get().position

			const fairyVision = Box.FromCenter(fairyPosition, DEFAULT_FAIRY_VISION)

			await agent.prompt({
				message,
				contextItems: [],
				bounds: fairyVision,
				modelName,
				selectedShapes,
				type: 'user',
			})
		},
		[agent, modelName, editor, fairy]
	)

	return (
		<div className="fairy-input">
			<form onSubmit={handleSubmit} className="fairy-input__form">
				<input
					ref={inputRef}
					name="input"
					type="text"
					autoComplete="off"
					placeholder={`Whisper to ${agent.id}...`}
					value={inputValue}
					onInput={(e) => setInputValue(e.currentTarget.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							const form = e.currentTarget.closest('form')
							if (form) {
								const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
								form.dispatchEvent(submitEvent)
							}
						}
					}}
					className="fairy-input__field"
				/>
				<FairyInputButton
					isGenerating={isGenerating}
					inputValue={inputValue}
					disabled={inputValue === '' && !isGenerating}
				/>
			</form>
		</div>
	)
}
