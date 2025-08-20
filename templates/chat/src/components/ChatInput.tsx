import { FormEvent, useCallback, useEffect, useRef } from 'react'
import { DefaultSpinner, TldrawUiTooltip } from 'tldraw'
import { useChatInputState } from '../hooks/useChatInputState'
import { ChatInputImage } from './ChatInputImage'
import { ImageIcon } from './icons/ImageIcon'
import { SendIcon } from './icons/SendIcon'
import { UploadIcon } from './icons/UploadIcon'
import { WhiteboardIcon } from './icons/WhiteboardIcon'
import { WhiteboardImage, WhiteboardModal, WhiteboardModalResult } from './WhiteboardModal'

interface ChatInputProps {
	onSendMessage: (message: string, images: WhiteboardImage[]) => void
	waitingForResponse: boolean
	scrollToBottom: (behavior?: ScrollBehavior) => void
	state: ReturnType<typeof useChatInputState>[0]
	dispatch: ReturnType<typeof useChatInputState>[1]
}

export function ChatInput({
	onSendMessage,
	waitingForResponse,
	scrollToBottom,
	state,
	dispatch,
}: ChatInputProps) {
	const { input, images, openWhiteboard, isDragging } = state
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const disabled = waitingForResponse || isDragging

	useEffect(() => {
		if (!disabled && textareaRef.current) {
			textareaRef.current.focus()
		}
	}, [disabled])

	// Auto-resize textarea and scroll to bottom when content changes
	useEffect(() => {
		if (textareaRef.current) {
			// Reset height to auto to get the correct scrollHeight
			textareaRef.current.style.height = 'auto'
			// Set height based on scrollHeight, with max height for ~5 lines
			const maxHeight = 5 * 24 // Approximate line height * 5 lines
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`

			// Scroll to bottom when textarea grows
			if (scrollToBottom) {
				scrollToBottom('instant')
			}
		}
	}, [input, scrollToBottom])

	useEffect(() => {
		if (scrollToBottom) {
			scrollToBottom('instant')
		}
	}, [images, scrollToBottom])

	const canSend = !disabled && (images.length > 0 || input.trim())

	const submit = () => {
		if (canSend) {
			onSendMessage(input, images)
		}
	}
	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		submit()
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter') {
			if (e.shiftKey) {
				// Shift+Enter: allow default behavior (insert newline)
				return
			} else {
				// Enter: submit form
				e.preventDefault()
				submit()
			}
		}
	}

	const handleCloseWhiteboard = useCallback(
		(result: WhiteboardModalResult) => {
			dispatch({ type: 'CLOSE_WHITEBOARD' })
			if (result.type === 'accept') {
				dispatch({ type: 'SET_IMAGE', payload: result.image })
				// Re-focus the input after adding an image
				if (textareaRef.current) {
					textareaRef.current.focus()
				}
			}
		},
		[dispatch]
	)

	const handleImageUpload = useCallback(() => {
		fileInputRef.current?.click()
	}, [])

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (!file || !file.type.startsWith('image/')) return

			// Open whiteboard with the uploaded file
			dispatch({
				type: 'OPEN_WHITEBOARD',
				payload: {
					uploadedFile: file,
				},
			})

			// Clear the input
			e.target.value = ''
		},
		[dispatch]
	)

	return (
		<form onSubmit={handleSubmit} className="chat-input-form">
			{isDragging && (
				<div className="drag-drop-indicator">
					<svg className="outline">
						<rect />
					</svg>
					<UploadIcon />
				</div>
			)}
			{images.length > 0 && (
				<div className="input-images">
					{images.map((image) => (
						<ChatInputImage
							key={image.id}
							image={image}
							onRemove={() => dispatch({ type: 'REMOVE_IMAGE', payload: image.id })}
							onEdit={() => {
								dispatch({
									type: 'OPEN_WHITEBOARD',
									payload: { id: image.id, snapshot: image.snapshot },
								})
							}}
						/>
					))}
				</div>
			)}
			<div className="input-container">
				<textarea
					ref={textareaRef}
					value={input}
					onChange={(e) => dispatch({ type: 'SET_INPUT', payload: e.target.value })}
					onKeyDown={handleKeyDown}
					placeholder={disabled ? '' : 'Type your message...'}
					className="chat-input"
					disabled={disabled}
					autoFocus={true}
					rows={1}
				/>
				{waitingForResponse && (
					<div className="input-spinner">
						<DefaultSpinner />
					</div>
				)}
			</div>
			<div className="chat-input-bottom">
				<TldrawUiTooltip content="Upload an image">
					<button
						type="button"
						className="icon-button"
						disabled={disabled}
						onClick={handleImageUpload}
					>
						<ImageIcon />
					</button>
				</TldrawUiTooltip>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handleFileChange}
					style={{ display: 'none' }}
				/>
				<TldrawUiTooltip content="Draw a sketch">
					<button
						type="button"
						className="icon-button"
						disabled={disabled}
						onClick={() => dispatch({ type: 'OPEN_WHITEBOARD', payload: {} })}
					>
						<WhiteboardIcon />
					</button>
				</TldrawUiTooltip>
				<TldrawUiTooltip content="Send message">
					<button type="submit" disabled={!canSend || disabled} className="icon-button">
						<SendIcon />
					</button>
				</TldrawUiTooltip>
			</div>
			{openWhiteboard && (
				<WhiteboardModal
					imageId={openWhiteboard.id}
					initialSnapshot={openWhiteboard.snapshot}
					uploadedFile={openWhiteboard.uploadedFile}
					onClose={handleCloseWhiteboard}
				/>
			)}
		</form>
	)
}
