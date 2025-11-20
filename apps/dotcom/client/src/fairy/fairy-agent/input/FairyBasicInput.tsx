import { FAIRY_VISION_DIMENSIONS } from '@tldraw/fairy-shared'
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Box, useValue } from 'tldraw'
import { useMsg } from '../../../tla/utils/i18n'
import { fairyMessages } from '../../fairy-messages'
// import { $fairyTasks } from '../../FairyTaskList'
import { FairyAgent } from '../agent/FairyAgent'

export function FairyBasicInput({ agent, onCancel }: { agent: FairyAgent; onCancel(): void }) {
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [inputValue, setInputValue] = useState('')
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])

	const fairyEntity = useValue(agent.$fairyEntity)
	const fairyConfig = useValue(agent.$fairyConfig)

	// Auto-resize textarea when content changes
	useLayoutEffect(() => {
		if (textareaRef.current) {
			// Reset height to auto to get the correct scrollHeight
			textareaRef.current.style.height = 'auto'
			// Set height based on scrollHeight
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
		}
	}, [inputValue])

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.focus()
		}
	}, [])

	const handleComplete = useCallback(
		async (value: string) => {
			textareaRef.current?.focus()
			agent.cancel()

			// If the user's message is empty, just cancel the current request (if there is one)
			if (value === '') {
				return
			}

			// Clear the input
			setInputValue('')

			// Prompt the agent
			const fairyPosition = fairyEntity.position
			const fairyVision = Box.FromCenter(fairyPosition, FAIRY_VISION_DIMENSIONS)

			// Clear the shared todo list if it's all completed - same as the agent starter kit's behavior
			// I dont think we should do this in case the agent wants to add more tasks before the current ones are done
			// $fairyTasks.update((fairyTaskList) => {
			// 	if (fairyTaskList.every((item) => item.status === 'done')) {
			// 		return []
			// 	}
			// 	return fairyTaskList
			// })

			await agent.prompt({
				message: value,
				bounds: fairyVision,
				source: 'user',
			})
		},
		[agent, fairyEntity]
	)

	// Handle keyboard input for Enter and Shift+Enter
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter') {
				if (e.shiftKey) {
					// Shift+Enter: allow default behavior (insert newline)
					return
				} else {
					// Enter: submit message
					e.preventDefault()
					if (inputValue.trim() || isGenerating) {
						handleComplete(inputValue)
					}
				}
			} else if (e.key === 'Escape') {
				onCancel()
			}
		},
		[inputValue, isGenerating, handleComplete, onCancel]
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
			<textarea
				ref={textareaRef}
				id="fairy-message-input"
				name="fairy-message"
				placeholder={whisperPlaceholder}
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onKeyDown={handleKeyDown}
				autoFocus
				className="fairy-input__field"
				disabled={isGenerating}
				rows={1}
				spellCheck={false}
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
