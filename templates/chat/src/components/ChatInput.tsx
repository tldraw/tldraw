import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { DefaultSpinner, TldrawUiTooltip } from 'tldraw'
import { useChatInputState } from '../hooks/useChatInputState'
import { ChatInputImage } from './ChatInputImage'
import { ImageIcon } from './icons/ImageIcon'
import { SendIcon } from './icons/SendIcon'
import { UploadIcon } from './icons/UploadIcon'
import { WhiteboardIcon } from './icons/WhiteboardIcon'
import { WhiteboardImage, WhiteboardModal } from './WhiteboardModal'

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
	const disabled = waitingForResponse || isDragging

	const textareaRef = useRef<HTMLTextAreaElement>(null)

	useEffect(() => {
		if (!disabled && textareaRef.current) {
			// focus the textarea when the input is enabled
			textareaRef.current.focus()
		}
	}, [disabled])

	// Auto-resize textarea and scroll to bottom when content changes.
	useLayoutEffect(() => {
		if (textareaRef.current) {
			// Reset height to auto to get the correct scrollHeight
			textareaRef.current.style.height = 'auto'
			// Set height based on scrollHeight, with max height for ~5 lines
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
		}
	}, [input])

	// Scroll to bottom when images are added.
	useLayoutEffect(() => {
		if (scrollToBottom) {
			scrollToBottom('instant')
		}
	}, [images, scrollToBottom])

	// the user can only send a message if the input is not disabled and there are either images or
	// text ready to send
	const canSend = !disabled && (images.length > 0 || input.trim())

	// when the user submits the form, we send the message.
	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		if (canSend) {
			onSendMessage(input, images)
		}
	}

	// when the user presses enter, we send the message.
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter') {
			if (e.shiftKey) {
				// Shift+Enter: allow default behavior (insert newline)
				return
			} else {
				// Enter: submit form
				e.preventDefault()
				if (canSend) {
					onSendMessage(input, images)
				}
			}
		}
	}

	// when the user clicks the image upload button, we open a file input to allow them to select an
	// image from their device.
	const handleImageUpload = useCallback(() => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.onchange = (e: Event) => {
			const target = e.target as HTMLInputElement
			const file = target.files?.[0]
			if (!file || !file.type.startsWith('image/')) return

			// Open whiteboard with the uploaded file
			dispatch({
				type: 'openWhiteboard',
				uploadedFile: file,
				imageName: file.name,
			})
		}
		input.click()
	}, [dispatch])

	// when the user cancels the whiteboard modal, we close it.
	const handleCancelWhiteboard = useCallback(() => {
		dispatch({ type: 'closeWhiteboard' })
	}, [dispatch])

	// when the user accepts the whiteboard modal, we add the image to the chat input & close it.
	const handleAcceptWhiteboard = useCallback(
		(image: WhiteboardImage) => {
			dispatch({ type: 'closeWhiteboard' })
			dispatch({ type: 'setImage', image })
			// Re-focus the input after adding an image
			if (textareaRef.current) {
				textareaRef.current.focus()
			}
		},
		[dispatch]
	)

	return (
		<form onSubmit={handleSubmit} className="chat-input-form">
			{/* if the user is dragging an image over the input area, we show a visual indicator
			hiding the normal input content. */}
			{isDragging && (
				<div className="drag-drop-indicator">
					<svg className="outline">
						{/* we use an svg to draw a dashed outline of the input area. svg allows us
						to control the dash length in a way that for example a normal <div> with a
						border would not. */}
						<rect />
					</svg>
					<UploadIcon />
				</div>
			)}

			{/* if the user has added images to the chat input, we show them above the input. */}
			{images.length > 0 && (
				<div className="input-images">
					{images.map((image) => (
						<ChatInputImage
							key={image.id}
							image={image}
							onRemove={() => dispatch({ type: 'removeImage', imageId: image.id })}
							onEdit={() => {
								dispatch({
									type: 'openWhiteboard',
									id: image.id,
									snapshot: image.snapshot,
									imageName: image.name,
								})
							}}
						/>
					))}
				</div>
			)}

			{/* the main input is a text area. we resize it automatically to fit its content. */}
			<div className="input-container">
				<textarea
					ref={textareaRef}
					value={input}
					onChange={(e) => dispatch({ type: 'setInput', input: e.target.value })}
					onKeyDown={handleKeyDown}
					placeholder={disabled ? '' : 'Type your message…'}
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

			{/* below the input we have several controls: */}
			<div className="chat-input-bottom">
				{/* a button to upload an image */}
				<TldrawUiTooltip content="Upload an image">
					<button
						type="button"
						aria-label="Upload an image"
						className="icon-button"
						disabled={disabled}
						onClick={handleImageUpload}
					>
						<ImageIcon />
					</button>
				</TldrawUiTooltip>
				{/* a button to open the whiteboard modal */}
				<TldrawUiTooltip content="Draw a sketch">
					<button
						type="button"
						aria-label="Draw a sketch"
						className="icon-button"
						disabled={disabled}
						onClick={() => dispatch({ type: 'openWhiteboard' })}
					>
						<WhiteboardIcon />
					</button>
				</TldrawUiTooltip>
				{/* a button to send the message */}
				<TldrawUiTooltip content="Send message">
					<button
						type="submit"
						disabled={!canSend || disabled}
						className="icon-button"
						aria-label="Send message"
					>
						<SendIcon />
					</button>
				</TldrawUiTooltip>
			</div>

			{/* if the user has opened the whiteboard modal, we show it. */}
			{openWhiteboard && (
				<WhiteboardModal
					imageId={openWhiteboard.id}
					initialSnapshot={openWhiteboard.snapshot}
					uploadedFile={openWhiteboard.uploadedFile}
					imageName={openWhiteboard.imageName}
					onCancel={handleCancelWhiteboard}
					onAccept={handleAcceptWhiteboard}
				/>
			)}
		</form>
	)
}
