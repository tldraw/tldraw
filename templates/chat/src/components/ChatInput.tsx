import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { DefaultSpinner, TldrawUiTooltip, TLEditorSnapshot } from 'tldraw'
import { ChatInputImage } from './ChatInputImage'
import { ImageIcon } from './icons/ImageIcon'
import { SendIcon } from './icons/SendIcon'
import { WhiteboardIcon } from './icons/WhiteboardIcon'
import { WhiteboardImage, WhiteboardModal, WhiteboardModalResult } from './WhiteboardModal'

interface ChatInputProps {
	onSendMessage: (message: string, images: WhiteboardImage[]) => void
	disabled?: boolean
	autoFocus?: boolean
	scrollToBottom?: (behavior?: ScrollBehavior) => void
}

export function ChatInput({
	onSendMessage,
	disabled = false,
	autoFocus = false,
	scrollToBottom,
}: ChatInputProps) {
	const [input, setInput] = useState('')
	const [images, setImages] = useState<WhiteboardImage[]>([])
	const [openWhiteboard, setOpenWhiteboard] = useState<{
		snapshot?: TLEditorSnapshot
		id?: string
	} | null>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

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
			setInput('')
			setImages([])
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

	const handleCloseWhiteboard = useCallback((result: WhiteboardModalResult) => {
		setOpenWhiteboard(null)
		if (result.type === 'accept') {
			setImages((prev) => {
				const newImages = [...prev]
				const index = newImages.findIndex((img) => img.id === result.image.id)
				if (index !== -1) {
					newImages[index] = result.image
				} else {
					newImages.push(result.image)
				}
				return newImages
			})
			// Re-focus the input after adding an image
			if (textareaRef.current) {
				textareaRef.current.focus()
			}
		}
	}, [])

	return (
		<form onSubmit={handleSubmit} className="chat-input-form">
			{images.length > 0 && (
				<div className="input-images">
					{images.map((image) => (
						<ChatInputImage
							key={image.id}
							image={image}
							onRemove={() => setImages((prev) => prev.filter((img) => img.id !== image.id))}
							onEdit={() => {
								setOpenWhiteboard({ id: image.id, snapshot: image.snapshot })
							}}
						/>
					))}
				</div>
			)}
			<div className="input-container">
				<textarea
					ref={textareaRef}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={disabled ? '' : 'Type your message...'}
					className="chat-input"
					disabled={disabled}
					autoFocus={autoFocus}
					rows={1}
				/>
				{disabled && (
					<div className="input-spinner">
						<DefaultSpinner />
					</div>
				)}
			</div>
			<div className="chat-input-bottom">
				<TldrawUiTooltip content="Upload an image">
					<button type="button" className="icon-button" disabled={disabled}>
						<ImageIcon />
					</button>
				</TldrawUiTooltip>
				<TldrawUiTooltip content="Draw a sketch">
					<button
						type="button"
						className="icon-button"
						disabled={disabled}
						onClick={() => setOpenWhiteboard({})}
					>
						<WhiteboardIcon />
					</button>
				</TldrawUiTooltip>
				<TldrawUiTooltip content="Send message">
					<button type="submit" disabled={!canSend} className="icon-button">
						<SendIcon />
					</button>
				</TldrawUiTooltip>
			</div>
			{openWhiteboard && (
				<WhiteboardModal
					imageId={openWhiteboard.id}
					initialSnapshot={openWhiteboard.snapshot}
					onClose={handleCloseWhiteboard}
				/>
			)}
		</form>
	)
}
