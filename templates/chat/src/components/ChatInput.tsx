import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { DefaultSpinner } from 'tldraw'
import { useChatInputState } from '../hooks/useChatInputState'
import { ChatInputImage } from './ChatInputImage'
import { ComposerIcon } from './ComposerIcon'
import { SendIcon } from './icons/SendIcon'
import { UploadIcon } from './icons/UploadIcon'
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

	const measureTextarea = useCallback(() => {
		const textarea = textareaRef.current
		if (!textarea) return
		textarea.style.height = 'auto'
		textarea.style.height = `${textarea.scrollHeight}px`
	}, [])

	useLayoutEffect(measureTextarea, [input, measureTextarea])

	useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea) return
		let lastWidth = textarea.clientWidth
		let frame = 0
		const observer = new ResizeObserver(() => {
			if (textarea.clientWidth === lastWidth) return
			lastWidth = textarea.clientWidth
			// Defer height changes to avoid a resize observer loop.
			cancelAnimationFrame(frame)
			frame = requestAnimationFrame(measureTextarea)
		})
		observer.observe(textarea)
		return () => {
			observer.disconnect()
			cancelAnimationFrame(frame)
		}
	}, [measureTextarea])

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

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.nativeEvent.isComposing) return
		if (e.key !== 'Enter' || e.shiftKey) return
		e.preventDefault()
		send()
	}

	const handleCancelWhiteboard = useCallback(() => {
		dispatch({ type: 'closeWhiteboard' })
		textareaRef.current?.focus()
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
		<div className="chat-composer">
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

				<div className="chat-input-row">
					<button
						type="button"
						className="icon-button"
						aria-label="Open sketch canvas"
						disabled={disabled}
						onClick={() => dispatch({ type: 'openWhiteboard' })}
					>
						<ComposerIcon name="plus" />
					</button>
					<div className="input-container">
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => dispatch({ type: 'setInput', input: e.target.value })}
							aria-label="Message"
							onKeyDown={handleKeyDown}
							placeholder={disabled ? '' : 'Ask a question'}
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

					<span className="composer-effort" aria-hidden="true">
						Medium <ComposerIcon name="chevron" />
					</span>
					<span className="icon-button composer-decoration" aria-hidden="true">
						<ComposerIcon name="microphone" />
					</span>
					<button
						type="submit"
						disabled={!canSend}
						className={`icon-button composer-send${!input.trim() && !images.length ? ' composer-send--voice' : ''}`}
						aria-label="Send message"
						title="Send message"
					>
						{input.trim() || images.length ? <SendIcon /> : <ComposerIcon name="voice" />}
					</button>
				</div>

				{openWhiteboard && (
					<WhiteboardModal
						imageId={openWhiteboard.id}
						imageEditor={openWhiteboard.imageEditor}
						layerize={openWhiteboard.layerize}
						onSendMessage={onSendMessage}
						waitingForResponse={waitingForResponse}
						initialSnapshot={openWhiteboard.snapshot}
						uploadedFile={openWhiteboard.uploadedFile}
						imageName={openWhiteboard.imageName}
						onCancel={handleCancelWhiteboard}
						onAccept={handleAcceptWhiteboard}
					/>
				)}
			</form>
			<p className="chat-composer-hint">
				<ComposerIcon name="sketch" />
				<span>Press the plus icon to the left of the text input to open up the sketch canvas</span>
			</p>
		</div>
	)
}
