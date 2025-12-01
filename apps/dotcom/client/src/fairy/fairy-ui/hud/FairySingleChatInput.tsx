import { CancelIcon, FAIRY_VISION_DIMENSIONS, LipsIcon } from '@tldraw/fairy-shared'
import { KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Box, TldrawUiTooltip, useEditor, useValue } from 'tldraw'
import { useTldrawAppUiEvents } from '../../../tla/utils/app-ui-events'
import { getIsCoarsePointer } from '../../../tla/utils/getIsCoarsePointer'
import { useMsg } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { getRandomNoInputMessage } from '../../fairy-helpers/getRandomNoInputMessage'
import { fairyMessages } from '../../fairy-messages'

export function FairySingleChatInput({ agent, onCancel }: { agent: FairyAgent; onCancel(): void }) {
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [inputValue, setInputValue] = useState('')
	const isGenerating = useValue('isGenerating', () => agent.requests.isGenerating(), [agent])

	const fairyEntity = useValue('fairyEntity', () => agent.getEntity(), [agent])
	const fairyConfig = useValue('fairyConfig', () => agent.getConfig(), [agent])

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

			trackEvent('fairy-send-message', { source: 'fairy-chat', fairyId: agent.id })
			handlePrompt(value)
		},
		[handlePrompt, trackEvent, agent.id]
	)

	// Handle keyboard input for Enter and Shift+Enter
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
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
			trackEvent('fairy-cancel-generation', { source: 'fairy-chat', fairyId: agent.id })
			agent.cancel()
		} else {
			// Send (will interrupt if generating)
			handleComplete(inputValue || getRandomNoInputMessage())
		}
	}

	const whisperPlaceholder = useMsg(fairyMessages.whisperToFairy, {
		name: fairyConfig.name?.split(' ')[0] ?? '',
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
					autoFocus={!isCoarsePointer && !editor.menus.hasAnyOpenMenus()}
					rows={1}
					spellCheck={false}
				/>
				<TldrawUiTooltip content={showCancel ? stopLabel : sendLabel} side="top">
					<button
						onClick={handleButtonClick}
						className="fairy-input__submit"
						title={showCancel ? stopLabel : sendLabel}
					>
						{showCancel ? <CancelIcon /> : <LipsIcon />}
					</button>
				</TldrawUiTooltip>
			</div>
		</div>
	)
}
