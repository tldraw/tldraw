import { convertTldrawShapeToFocusShape, FAIRY_VISION_DIMENSIONS } from '@tldraw/fairy-shared'
import { useCallback, useRef, useState } from 'react'
import { Box, TldrawUiInput, useValue } from 'tldraw'
import { FairyAgent } from '../agent/FairyAgent'

export function FairyBasicInput({ agent }: { agent: FairyAgent }) {
	const { editor } = agent
	const inputRef = useRef<HTMLInputElement>(null)
	const [inputValue, setInputValue] = useState('')
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])

	const fairy = useValue('fairy', () => agent.$fairy, [agent])

	const handleComplete = useCallback(
		async (value: string) => {
			// If the user's message is empty, just cancel the current request (if there is one)
			if (value === '') {
				agent.cancel()
				return
			}

			// Clear the input
			setInputValue('')

			// Prompt the agent
			const selectedShapes = editor
				.getSelectedShapes()
				.map((shape) => convertTldrawShapeToFocusShape(editor, shape))

			const fairyPosition = fairy.get().position

			const fairyVision = Box.FromCenter(fairyPosition, FAIRY_VISION_DIMENSIONS)

			await agent.prompt({
				message: value,
				contextItems: [],
				bounds: fairyVision,
				selectedShapes,
				type: 'user',
			})
		},
		[agent, editor, fairy]
	)

	const shouldCancel = isGenerating && inputValue === ''

	const handleButtonClick = () => {
		if (shouldCancel) {
			agent.cancel()
		} else {
			handleComplete(inputValue)
		}
	}

	return (
		<div className="fairy-input">
			<TldrawUiInput
				ref={inputRef}
				placeholder={`Whisper to ${agent.id}...`}
				value={inputValue}
				onValueChange={setInputValue}
				onComplete={handleComplete}
				autoFocus
				className="fairy-input__field"
			/>
			<button
				onClick={handleButtonClick}
				disabled={inputValue === '' && !isGenerating}
				className="fairy-input__submit"
				title={shouldCancel ? 'Stop' : 'Send'}
			>
				{shouldCancel ? '⏹' : '👄'}
			</button>
		</div>
	)
}
