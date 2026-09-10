import { FormEvent, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { DefaultSpinner } from 'tldraw'
import { useChatInputState } from '../hooks/useChatInputState'
import { ChatInputImage } from './ChatInputImage'
import { ComposerIcon, ComposerIconName } from './ComposerIcon'
import { SendIcon } from './icons/SendIcon'
import { UploadIcon } from './icons/UploadIcon'
import { WhiteboardImage, WhiteboardModal } from './WhiteboardModal'

const composerItems: {
	icon: ComposerIconName
	label: string
	description: string
	action?: 'upload' | 'sketch' | 'image'
}[] = [
	{
		icon: 'attachment',
		label: 'Add photos & files',
		description: 'Upload from computer',
		action: 'upload',
	},
	{
		icon: 'library',
		label: 'Add from library',
		description: 'Browse and search your files, including Google Drive',
	},
	{ icon: 'image', label: 'Create image', description: 'Visualize anything', action: 'image' },
	{ icon: 'web', label: 'Web search', description: 'Find real-time news and info' },
	{ icon: 'research', label: 'Deep research', description: 'Get a detailed report' },
	{ icon: 'sketch', label: 'Sketch', description: 'Draw and attach an image', action: 'sketch' },
	{ icon: 'notion', label: 'Notion', description: 'Notion docs and workflows' },
	{ icon: 'gmail', label: 'Gmail', description: 'Read and manage Gmail' },
	{ icon: 'drive', label: 'Google Drive', description: 'Drive, Docs, Sheets or Slides' },
]

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
	const composerRef = useRef<HTMLDivElement>(null)
	const menuId = useId()
	const [menuOpen, setMenuOpen] = useState(false)
	const [caret, setCaret] = useState(0)
	const [activeIndex, setActiveIndex] = useState(0)
	const mention = input.slice(0, caret).match(/(?:^|\s)@([^\s@]*)$/)
	const query = mention?.[1].toLowerCase() ?? ''
	const items = composerItems.filter((item) => !query || item.label.toLowerCase().includes(query))
	const showMenu = menuOpen && !disabled && !openWhiteboard

	const closeMenu = () => setMenuOpen(false)
	const selectItem = (item: (typeof composerItems)[number]) => {
		if (!item.action) return
		if (mention) {
			const start = caret - query.length - 1
			dispatch({ type: 'setInput', input: input.slice(0, start) + input.slice(caret) })
			setCaret(start)
		}
		closeMenu()
		if (item.action === 'image') {
			dispatch({ type: 'setInput', input: 'Create an image of ' })
			textareaRef.current?.focus()
		} else if (item.action === 'sketch') dispatch({ type: 'openWhiteboard' })
		else handleImageUpload()
	}

	useEffect(() => {
		if (!menuOpen) return
		const onPointerDown = (event: PointerEvent) => {
			if (!composerRef.current?.contains(event.target as Node)) setMenuOpen(false)
		}
		document.addEventListener('pointerdown', onPointerDown)
		return () => document.removeEventListener('pointerdown', onPointerDown)
	}, [menuOpen])

	useEffect(() => {
		// focus the textarea when the input is enabled
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

	useEffect(() => {
		if (disabled) setMenuOpen(false)
	}, [disabled])

	// Scroll to bottom when images are added.
	useLayoutEffect(() => {
		scrollToBottom('instant')
	}, [images, scrollToBottom])

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

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.nativeEvent.isComposing) return
		if (showMenu) {
			if (e.key === 'Escape') {
				e.preventDefault()
				closeMenu()
				return
			}
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault()
				if (items.length)
					setActiveIndex(
						(index) => (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
					)
				return
			}
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				if (items[activeIndex]) selectItem(items[activeIndex])
				return
			}
		}
		if (e.key !== 'Enter' || e.shiftKey) return
		e.preventDefault()
		send()
	}

	// when the user clicks the image upload button, we open a file input to allow them to select an
	// image from their device.
	const handleImageUpload = useCallback(() => {
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

	// when the user cancels the whiteboard modal, we close it.
	const handleCancelWhiteboard = useCallback(() => {
		dispatch({ type: 'closeWhiteboard' })
		textareaRef.current?.focus()
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
		<div
			className="chat-composer"
			ref={composerRef}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) closeMenu()
			}}
		>
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

				<div className="chat-input-row">
					<button
						type="button"
						className="icon-button"
						aria-label="Add attachments and tools"
						aria-expanded={showMenu}
						aria-controls={showMenu ? menuId : undefined}
						disabled={disabled}
						onClick={() => {
							setMenuOpen(!showMenu)
							setActiveIndex(0)
							textareaRef.current?.focus()
						}}
					>
						<ComposerIcon name="plus" />
					</button>
					<div className="input-container">
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => {
								dispatch({ type: 'setInput', input: e.target.value })
								setCaret(e.target.selectionStart)
								setMenuOpen(
									/(?:^|\s)@[^\s@]*$/.test(e.target.value.slice(0, e.target.selectionStart))
								)
								setActiveIndex(0)
							}}
							onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
							aria-label="Message"
							aria-autocomplete="list"
							aria-controls={showMenu ? menuId : undefined}
							aria-activedescendant={
								showMenu && items[activeIndex] ? `${menuId}-${activeIndex}` : undefined
							}
							onKeyDown={handleKeyDown}
							placeholder={disabled ? '' : 'Ask ChatGPT'}
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

				{/* if the user has opened the whiteboard modal, we show it. */}
				{openWhiteboard && (
					<WhiteboardModal
						imageId={openWhiteboard.id}
						imageEditor={openWhiteboard.imageEditor}
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
			{showMenu && (
				<div className="composer-menu">
					{query && <div className="composer-menu-heading">Plugins</div>}
					<div id={menuId} role="listbox" aria-label="Attachments and tools">
						{items.map((item, index) => (
							<div
								key={item.label}
								id={`${menuId}-${index}`}
								role="option"
								aria-selected={index === activeIndex}
								aria-disabled={!item.action}
								className={`composer-menu-item${index === activeIndex ? ' composer-menu-item--active' : ''}`}
								onPointerMove={() => setActiveIndex(index)}
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => selectItem(item)}
							>
								<span className={`composer-menu-icon composer-menu-icon--${item.icon}`}>
									<ComposerIcon name={item.icon} />
								</span>
								<span className="composer-menu-label">{item.label}</span>
								<span className="composer-menu-description">{item.description}</span>
							</div>
						))}
					</div>
					{!items.length && <div className="composer-menu-heading">No matching tools</div>}
					{!query && (
						<div className="composer-menu-hint">
							Type to search plugins, files, folders &amp; skills
						</div>
					)}
				</div>
			)}
		</div>
	)
}
