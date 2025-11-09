import { convertTldrawShapeToFocusedShape, FAIRY_VISION_DIMENSIONS } from '@tldraw/fairy-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, TldrawUiInput, useValue } from 'tldraw'
import { $sharedTodoList } from '../../SharedTodoList'
import { FairyAgent } from '../agent/FairyAgent'

export function FairyBasicInput({ agent, onCancel }: { agent: FairyAgent; onCancel(): void }) {
	const { editor } = agent
	const inputRef = useRef<HTMLInputElement>(null)
	const [inputValue, setInputValue] = useState('')
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])

	const fairyEntity = useValue(agent.$fairyEntity)
	const fairyConfig = useValue(agent.$fairyConfig)

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.spellcheck = false
		}
	}, [])

	const handleComplete = useCallback(
		async (value: string) => {
			agent.cancel()

			// If the user's message is empty, just cancel the current request (if there is one)
			if (value === '') {
				return
			}

			// Clear the input
			setInputValue('')

			// Prompt the agent
			const selectedShapes = editor
				.getSelectedShapes()
				.map((shape) => convertTldrawShapeToFocusedShape(editor, shape))

			const fairyPosition = fairyEntity.position
			const fairyVision = Box.FromCenter(fairyPosition, FAIRY_VISION_DIMENSIONS)

			// Clear the shared todo list if it's all completed - same as the agent starter kit's behavior
			$sharedTodoList.update((todoList) => {
				if (todoList.every((item) => item.status === 'done')) {
					return []
				}
				return todoList
			})

			await agent.prompt({
				message: value,
				contextItems: [],
				bounds: fairyVision,
				selectedShapes,
				type: 'user',
			})
		},
		[agent, editor, fairyEntity]
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
				placeholder={`Whisper to ${fairyConfig.name}...`}
				value={inputValue}
				onValueChange={setInputValue}
				onComplete={handleComplete}
				onCancel={onCancel}
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
