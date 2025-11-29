import { CancelIcon, FAIRY_VISION_DIMENSIONS, LipsIcon } from '@tldraw/fairy-shared'
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Box, useValue } from 'tldraw'
import { useMsg } from '../../../tla/utils/i18n'
import { fairyMessages } from '../../fairy-messages'
// import { $fairyTasks } from '../../FairyTaskList'
import { getIsCoarsePointer } from '../../../tla/utils/getIsCoarsePointer'
import { getRandomNoInputMessage } from '../../fairy-helpers/getRandomNoInputMessage'
import { FairyAgent } from '../agent/FairyAgent'

export function FairySingleChatInput({ agent, onCancel }: { agent: FairyAgent; onCancel(): void }) {
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [inputValue, setInputValue] = useState('')
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])
	const enterMsg = useMsg(fairyMessages.enterMsg)

	const fairyEntity = useValue('fairyEntity', () => agent.$fairyEntity.get(), [agent])
	const fairyConfig = useValue('fairyConfig', () => agent.$fairyConfig.get(), [agent])

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
					// Enter: submit message (interrupt() handles cancellation if generating)
					e.preventDefault()
					handleComplete(inputValue || getRandomNoInputMessage())
				}
			} else if (e.key === 'Escape') {
				onCancel()
			}
		},
		[inputValue, handleComplete, onCancel]
	)

	// Show cancel button only when generating AND no input text
	const showCancel = isGenerating && inputValue === ''

	const handleButtonClick = () => {
		if (showCancel) {
			// Hard stop - cancel only, don't send
			agent.cancel()
		} else {
			// Send (will interrupt if generating)
			handleComplete(inputValue || getRandomNoInputMessage())
		}
	}

	const handleMouseDown = useCallback(
		(e: React.PointerEvent<HTMLTextAreaElement>) => {
			if (getIsCoarsePointer()) {
				e.stopPropagation()
				e.preventDefault()
				e.currentTarget.blur()
				const value = window.prompt(enterMsg)
				if (value) {
					handlePrompt(value)
				}
			}
		},
		[handlePrompt, enterMsg]
	)

	const whisperPlaceholder = useMsg(fairyMessages.whisperToFairy, {
		name: fairyConfig.name.split(' ')[0],
	})
	const stopLabel = useMsg(fairyMessages.stopLabel)
	const sendLabel = useMsg(fairyMessages.sendLabel)
	const isCoarsePointer = getIsCoarsePointer()

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
					className="fairy-input__field"
					name="fairy-message"
					placeholder={whisperPlaceholder}
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={handleKeyDown}
					onMouseDown={handleMouseDown}
					readOnly={isCoarsePointer}
					autoFocus={!isCoarsePointer}
					rows={1}
					spellCheck={false}
				/>
				<button
					onClick={handleButtonClick}
					className="fairy-input__submit"
					title={showCancel ? stopLabel : sendLabel}
				>
					{showCancel ? <CancelIcon /> : <LipsIcon />}
				</button>
			</div>
		</div>
	)
}
