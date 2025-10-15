import { convertTldrawShapeToFocusedShape, DEFAULT_FAIRY_VISION } from '@tldraw/fairy-shared'
import { useCallback, useRef, useState } from 'react'
import { Box, TldrawUiInput, useValue } from 'tldraw'
import { TldrawFairyAgent } from '../agent/TldrawFairyAgent'
import { FairyInputButton } from './FairyInputButton'

export function FairyBasicInput({ agent }: { agent: TldrawFairyAgent }) {
	const { editor } = agent
	const inputRef = useRef<HTMLInputElement>(null)
	const [inputValue, setInputValue] = useState('')
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])
	const modelName = useValue(agent.$modelName)

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
				.map((shape) => convertTldrawShapeToFocusedShape(editor, shape))

			const fairyPosition = fairy.get().position

			const fairyVision = Box.FromCenter(fairyPosition, DEFAULT_FAIRY_VISION)

			await agent.prompt({
				message: value,
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
			<TldrawUiInput
				ref={inputRef}
				placeholder={`Whisper to ${agent.id}...`}
				value={inputValue}
				onValueChange={setInputValue}
				onComplete={handleComplete}
				autoFocus
				className="fairy-input__field"
			/>
			<FairyInputButton
				isGenerating={isGenerating}
				inputValue={inputValue}
				disabled={inputValue === '' && !isGenerating}
			/>
		</div>
	)
}
