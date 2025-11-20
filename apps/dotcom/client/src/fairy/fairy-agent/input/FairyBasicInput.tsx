import { FAIRY_VISION_DIMENSIONS } from '@tldraw/fairy-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, TldrawUiInput, useValue } from 'tldraw'
import { useMsg } from '../../../tla/utils/i18n'
import { fairyMessages } from '../../fairy-messages'
// import { $fairyTasks } from '../../FairyTaskList'
import { FairyAgent } from '../agent/FairyAgent'

export function FairyBasicInput({ agent, onCancel }: { agent: FairyAgent; onCancel(): void }) {
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
			inputRef.current?.focus()

			// If the user's message is empty, just cancel the current request (if there is one)
			if (value === '') {
				return
			}

			// Clear the input
			setInputValue('')

			// Prompt the agent
			const fairyPosition = fairyEntity.position
			const fairyVision = Box.FromCenter(fairyPosition, FAIRY_VISION_DIMENSIONS)

			agent.interrupt({
				input: {
					message: value,
					bounds: fairyVision,
					source: 'user',
				},
			})
		},
		[agent, fairyEntity]
	)

	const shouldCancel = isGenerating && inputValue === ''

	const handleButtonClick = () => {
		if (shouldCancel) {
			agent.cancel()
		} else {
			handleComplete(inputValue)
		}
	}

	const whisperPlaceholder = useMsg(fairyMessages.whisperToFairy, { name: fairyConfig.name })
	const stopLabel = useMsg(fairyMessages.stopLabel)
	const sendLabel = useMsg(fairyMessages.sendLabel)

	return (
		<div className="fairy-input">
			<TldrawUiInput
				ref={inputRef}
				placeholder={whisperPlaceholder}
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
				title={shouldCancel ? stopLabel : sendLabel}
			>
				{shouldCancel ? '⏹' : '👄'}
			</button>
		</div>
	)
}
