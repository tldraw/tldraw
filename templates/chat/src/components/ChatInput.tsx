import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { DefaultSpinner } from 'tldraw'
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
		if (!disabled) textareaRef.current?.focus()
	}, [disabled])

	// Auto-resize the textarea to fit its content.
	useLayoutEffect(() => {
		if (textareaRef.current) {
			// reset to auto first so scrollHeight reflects the content, not the previous height
			textareaRef.current.style.height = 'auto'
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
		}
	}, [input])

	useLayoutEffect(() => {
		scrollToBottom('instant')
	}, [images, scrollToBottom])

	const canSend = !disabled && (images.length > 0 || input.trim())

	const send = () => {
		if (canSend) onSendMessage(input, images)
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		send()
	}

	// Enter sends; shift+enter keeps the default newline behavior.
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key !== 'Enter' || e.shiftKey) return
		e.preventDefault()
		send()
	}

	const handleImageUpload = useCallback(() => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.onchange = (e: Event) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file || !file.type.startsWith('image/')) return
			dispatch({ type: 'openWhiteboard', uploadedFile: file, imageName: file.name })
		}
		input.click()
	}, [dispatch])

	const handleCancelWhiteboard = useCallback(() => {
		dispatch({ type: 'closeWhiteboard' })
	}, [dispatch])

	const handleAcceptWhiteboard = useCallback(
		(image: WhiteboardImage) => {
			dispatch({ type: 'closeWhiteboard' })
			dispatch({ type: 'setImage', image })
			textareaRef.current?.focus()
		},
		[dispatch]
	)

	return (
		<form onSubmit={handleSubmit} className="chat-input-form">
			{isDragging && (
				<div className="drag-drop-indicator">
					<svg className="outline">
						{/* svg lets us control the dash length of the outline in a way a css border can't */}
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

			<div className="chat-input-bottom">
				<button
					type="button"
					aria-label="Upload an image"
					title="Upload an image"
					className="icon-button"
					disabled={disabled}
					onClick={handleImageUpload}
				>
					<ImageIcon />
				</button>
				<button
					type="button"
					aria-label="Draw a sketch"
					title="Draw a sketch"
					className="icon-button"
					disabled={disabled}
					onClick={() => dispatch({ type: 'openWhiteboard' })}
				>
					<WhiteboardIcon />
				</button>
				<button
					type="submit"
					disabled={!canSend || disabled}
					className="icon-button"
					aria-label="Send message"
					title="Send message"
				>
					<SendIcon />
				</button>
			</div>

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
