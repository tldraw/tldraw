import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DefaultSpinner } from 'tldraw'
import { useChatInputState } from '../hooks/useChatInputState'
import { ChatInputImage } from './ChatInputImage'
import { ChevronDownIcon } from './icons/ChevronDownIcon'
import { ImageIcon } from './icons/ImageIcon'
import { MicIcon } from './icons/MicIcon'
import { PlusIcon } from './icons/PlusIcon'
import { SendIcon } from './icons/SendIcon'
import { UploadIcon } from './icons/UploadIcon'
import { WaveformIcon } from './icons/WaveformIcon'
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

	const formRef = useRef<HTMLFormElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const attachMenuRef = useRef<HTMLDivElement>(null)

	// The composer starts as a single pill-shaped row. Once the text wraps onto a second line or an
	// image is attached, it expands into a taller card with the controls on their own row.
	const [isMultiline, setIsMultiline] = useState(false)
	const isExpanded = isMultiline || images.length > 0

	// The "+" button opens a small menu with the attachment options.
	const [attachMenuOpen, setAttachMenuOpen] = useState(false)

	useEffect(() => {
		// focus the textarea when the input is enabled
		if (!disabled) textareaRef.current?.focus()
	}, [disabled])

	// Auto-resize the textarea to fit its content and check whether it wraps onto more than one
	// line.
	const measureTextarea = useCallback(() => {
		const textarea = textareaRef.current
		if (!textarea) return
		// Reset height to auto to get the correct scrollHeight
		textarea.style.height = 'auto'
		// Set height based on scrollHeight. The max height is capped in css.
		textarea.style.height = `${textarea.scrollHeight}px`
		// An empty textarea never counts as multiline, even if its placeholder wraps.
		const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight)
		setIsMultiline(textarea.value !== '' && textarea.scrollHeight > lineHeight * 1.5)
	}, [])

	useLayoutEffect(measureTextarea, [input, measureTextarea])

	// The text wraps differently as the composer changes width, so re-measure when it resizes.
	useEffect(() => {
		const form = formRef.current
		if (!form) return
		let lastWidth = form.clientWidth
		const observer = new ResizeObserver(() => {
			if (form.clientWidth === lastWidth) return
			lastWidth = form.clientWidth
			measureTextarea()
		})
		observer.observe(form)
		return () => observer.disconnect()
	}, [measureTextarea])

	// Scroll to bottom when images are added.
	useLayoutEffect(() => {
		scrollToBottom('instant')
	}, [images, scrollToBottom])

	// Close the attachment menu when the user clicks outside it or presses escape.
	useEffect(() => {
		if (!attachMenuOpen) return
		const handlePointerDown = (e: PointerEvent) => {
			if (!attachMenuRef.current?.contains(e.target as Node)) setAttachMenuOpen(false)
		}
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setAttachMenuOpen(false)
				textareaRef.current?.focus()
			}
		}
		document.addEventListener('pointerdown', handlePointerDown)
		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown)
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [attachMenuOpen])

	// the user can only send a message if the input is not disabled and there are either images or
	// text ready to send
	const canSend = !disabled && (images.length > 0 || input.trim())

	const send = () => {
		if (canSend) onSendMessage(input, images)
	}

	// when the user submits the form, we send the message.
	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		send()
	}

	// when the user presses enter, we send the message.
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Shift+Enter: allow default behavior (insert newline)
		if (e.key !== 'Enter' || e.shiftKey) return
		// Enter: submit form
		e.preventDefault()
		send()
	}

	// when the user clicks the image upload button, we open a file input to allow them to select an
	// image from their device.
	const handleImageUpload = useCallback(() => {
		setAttachMenuOpen(false)
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.onchange = (e: Event) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file || !file.type.startsWith('image/')) return

			// Open whiteboard with the uploaded file
			dispatch({ type: 'openWhiteboard', uploadedFile: file, imageName: file.name })
		}
		input.click()
	}, [dispatch])

	// when the user chooses to draw a sketch, we open the whiteboard modal.
	const handleOpenWhiteboard = useCallback(() => {
		setAttachMenuOpen(false)
		dispatch({ type: 'openWhiteboard' })
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
			textareaRef.current?.focus()
		},
		[dispatch]
	)

	return (
		<form
			ref={formRef}
			onSubmit={handleSubmit}
			className={`chat-input-form${isExpanded ? ' chat-input-form--expanded' : ''}`}
		>
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

			{/* the "+" button opens a menu with the attachment options: uploading an image or
			drawing a sketch. */}
			<div className="attach-menu" ref={attachMenuRef}>
				<button
					type="button"
					aria-label="Add an attachment"
					title="Add an attachment"
					aria-haspopup="menu"
					aria-expanded={attachMenuOpen}
					className="icon-button attach-menu__trigger"
					disabled={disabled}
					onClick={() => setAttachMenuOpen((open) => !open)}
				>
					<PlusIcon />
				</button>
				{attachMenuOpen && (
					<div className="attach-menu__popover" role="menu">
						<button
							type="button"
							role="menuitem"
							className="attach-menu__item"
							onClick={handleImageUpload}
						>
							<ImageIcon />
							Upload an image
						</button>
						<button
							type="button"
							role="menuitem"
							className="attach-menu__item"
							onClick={handleOpenWhiteboard}
						>
							<WhiteboardIcon />
							Draw a sketch
						</button>
					</div>
				)}
			</div>

			{/* the main input is a text area. we resize it automatically to fit its content. */}
			<div className="input-container">
				<textarea
					ref={textareaRef}
					value={input}
					onChange={(e) => dispatch({ type: 'setInput', input: e.target.value })}
					onKeyDown={handleKeyDown}
					placeholder={disabled ? '' : 'Ask anything'}
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

			{/* to the right of the input we have the model picker, the mic and the send button. the
			model picker and mic are decorative, like the rest of the app chrome. */}
			<div className="chat-input-actions">
				<span className="model-picker" aria-hidden="true">
					Instant
					<ChevronDownIcon />
				</span>
				<span className="icon-button icon-button--decorative" aria-hidden="true">
					<MicIcon />
				</span>
				{/* the send button shows a voice waveform while the composer is empty and an arrow
				once there is something to send (or a response is pending). */}
				{canSend || waitingForResponse ? (
					<button
						type="submit"
						className="icon-button send-button"
						aria-label="Send message"
						title="Send message"
						disabled={!canSend}
					>
						<SendIcon />
					</button>
				) : (
					<span className="icon-button send-button" aria-hidden="true">
						<WaveformIcon />
					</span>
				)}
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
