import { CancelIcon, FAIRY_VISION_DIMENSIONS, LipsIcon } from '@tldraw/fairy-shared'
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Box, useValue } from 'tldraw'
import { useMsg } from '../../../tla/utils/i18n'
import { fairyMessages } from '../../fairy-messages'
// import { $fairyTasks } from '../../FairyTaskList'
import { getIsCoarsePointer } from '../../../tla/utils/getIsCoarsePointer'
import { FairyAgent } from '../agent/FairyAgent'

export function FairyBasicInput({ agent, onCancel }: { agent: FairyAgent; onCancel(): void }) {
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [inputValue, setInputValue] = useState('')
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])
	const enterMsg = useMsg(fairyMessages.enterMsg)

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
		if (textareaRef.current && !getIsCoarsePointer()) {
			textareaRef.current.focus()
		}
	}, [])

	const handlePrompt = useCallback(
		(value: string) => {
			// Prompt the agent
			const fairyPosition = fairyEntity.position
			const fairyVision = Box.FromCenter(fairyPosition, FAIRY_VISION_DIMENSIONS)

			agent.interrupt({
				input: {
					agentMessages: [value],
					userMessages: [value],
					bounds: fairyVision,
					source: 'user',
				},
			})
		},
		[agent, fairyEntity]
	)

	const handleComplete = useCallback(
		async (value: string) => {
			textareaRef.current?.focus()

			// If the user's message is empty, just cancel the current request (if there is one)
			if (value === '') {
				return
			}

			// Clear the input
			setInputValue('')

			handlePrompt(value)
		},
		[handlePrompt]
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

	const handleButtonClick = () => {
		if (isGenerating) {
			agent.cancel()
		} else {
			handleComplete(inputValue ?? ':kiss:')
		}
	}

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLTextAreaElement>) => {
			if (getIsCoarsePointer()) {
				e.stopPropagation()
				const value = window.prompt(enterMsg)
				if (value) {
					handlePrompt(value)
				}
			}
		},
		[handlePrompt, enterMsg]
	)

	const whisperPlaceholder = useMsg(fairyMessages.whisperToFairy, { name: fairyConfig.name })
	const stopLabel = useMsg(fairyMessages.stopLabel)
	const sendLabel = useMsg(fairyMessages.sendLabel)

	return (
		<div className="fairy-input-container">
			<div
				className="fairy-input"
				// fake it
				onClick={() => textareaRef.current?.focus()}
				style={{ cursor: 'text' }}
			>
				<textarea
					ref={textareaRef}
					id="fairy-message-input"
					name="fairy-message"
					placeholder={whisperPlaceholder}
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={handleKeyDown}
					onPointerDown={handlePointerDown}
					autoFocus={!getIsCoarsePointer()}
					className="fairy-input__field"
					rows={1}
					spellCheck={false}
				/>
				<button
					onClick={handleButtonClick}
					className="fairy-input__submit"
					title={isGenerating ? stopLabel : sendLabel}
				>
					{isGenerating ? <CancelIcon /> : <LipsIcon />}
				</button>
			</div>
		</div>
	)
}
