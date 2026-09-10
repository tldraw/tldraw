import { type UIMessage } from '@ai-sdk/react'
import { memo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import { FileHelpers } from 'tldraw'
import { ComposerIcon } from './ComposerIcon'
import { TldrawProviderMetadata } from './WhiteboardModal'

export type ImageClickTarget = (TldrawProviderMetadata | { uploadedFile: File }) & {
	layerize?: boolean
	imageEditor?: boolean
	imageName?: string
}

interface ChatMessageProps {
	message: UIMessage
	onImageClick: (opts: ImageClickTarget) => void
}

export const ChatMessage = memo(function ChatMessage({ message, onImageClick }: ChatMessageProps) {
	// For AI messages with no content, show thinking state
	if (
		message.role === 'assistant' &&
		!message.parts.some(
			(part) =>
				part.type === 'file' || part.type === 'text' || part.type === 'tool-image_generation'
		)
	) {
		return (
			<div className="message assistant-message thinking-message">
				<div className="thinking-text">Thinking…</div>
			</div>
		)
	}

	return (
		<div
			className={`message-group ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
		>
			{message.parts.map((part, index) => {
				if (part.type === 'tool-image_generation') {
					if (part.state === 'output-error') {
						return (
							<p key={index} role="alert">
								Could not generate the image. Please try again.
							</p>
						)
					}
					if (part.state !== 'output-available') {
						return (
							<p key={index} role="status" className="thinking-text">
								Creating image…
							</p>
						)
					}
					const output = part.output
					if (
						!output ||
						typeof output !== 'object' ||
						!('result' in output) ||
						typeof output.result !== 'string' ||
						!output.result
					) {
						return (
							<p key={index} role="alert">
								No image was returned. Please try again.
							</p>
						)
					}
					return (
						<MessageImage
							key={index}
							src={`data:image/png;base64,${output.result}`}
							alt="Generated image"
							filename="generated-image.png"
							imageEditor
							onImageClick={onImageClick}
						/>
					)
				}

				if (part.type === 'file') {
					// we stash a snapshot of the tldraw document in the provider metadata:
					const tldrawMetadata = part.providerMetadata?.tldraw as TldrawProviderMetadata | undefined

					return (
						<MessageImage
							key={index}
							src={part.url}
							alt={part.filename || 'Chat image'}
							filename={part.filename}
							metadata={tldrawMetadata}
							imageEditor={message.role === 'assistant'}
							onImageClick={onImageClick}
						/>
					)
				}

				if (part.type === 'text') {
					return (
						<div key={index} className="message message-text">
							<ReactMarkdown
								components={{
									img: ({ src, alt }) =>
										typeof src === 'string' ? (
											<MessageImage
												src={src}
												alt={alt || 'Chat image'}
												imageEditor={message.role === 'assistant'}
												onImageClick={onImageClick}
											/>
										) : null,
									a: ({ node, children, ...props }) =>
										node?.children.some(
											(child) => child.type === 'element' && child.tagName === 'img'
										) ? (
											<span>{children}</span>
										) : (
											<a {...props}>{children}</a>
										),
								}}
							>
								{part.text}
							</ReactMarkdown>
						</div>
					)
				}

				return null
			})}
			{message.role === 'assistant' && (
				<div className="message-actions" aria-hidden="true">
					{(['copy', 'feedback', 'share', 'retry', 'more'] as const).map((name) => (
						<span key={name}>
							<ComposerIcon name={name} />
						</span>
					))}
				</div>
			)}
		</div>
	)
})

function MessageImage({
	src,
	alt,
	filename = 'image.png',
	metadata,
	imageEditor,
	onImageClick,
}: {
	src: string
	alt: string
	filename?: string
	metadata?: TldrawProviderMetadata
	imageEditor: boolean
	onImageClick: (opts: ImageClickTarget) => void
}) {
	const [isOpening, setIsOpening] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
	useEffect(() => {
		if (!menu) return
		const dismiss = () => setMenu(null)
		const keydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') dismiss()
		}
		window.addEventListener('pointerdown', dismiss)
		window.addEventListener('keydown', keydown)
		window.addEventListener('scroll', dismiss, true)
		return () => {
			window.removeEventListener('pointerdown', dismiss)
			window.removeEventListener('keydown', keydown)
			window.removeEventListener('scroll', dismiss, true)
		}
	}, [menu])
	async function openImage(layerize = false) {
		if (isOpening) return
		setIsOpening(true)
		setError(null)
		try {
			if (metadata && !layerize) {
				onImageClick({ ...metadata, imageEditor })
			} else {
				const blob = await FileHelpers.urlToBlob(src)
				const file = new File([blob], filename, { type: blob.type })
				onImageClick({
					uploadedFile: file,
					imageName: file.name,
					imageEditor: imageEditor || layerize,
					layerize,
				})
			}
		} catch {
			setError(
				'Could not open this image. Its host may not allow it to be downloaded. Try uploading a saved copy.'
			)
		} finally {
			setIsOpening(false)
		}
	}

	return (
		<>
			<button
				aria-label="Open image"
				aria-busy={isOpening}
				disabled={isOpening}
				className="message message-image message-image-clickable"
				onClick={() => void openImage()}
				onContextMenu={(event) => {
					event.preventDefault()
					setMenu({
						x: Math.min(event.clientX, window.innerWidth - 150),
						y: Math.min(event.clientY, window.innerHeight - 50),
					})
				}}
				type="button"
			>
				{(imageEditor || isOpening) && (
					<span className="message-image-edit">{isOpening ? 'Opening…' : 'Edit'}</span>
				)}
				<img src={src} alt={alt} className="message-image-content" />
			</button>
			{menu &&
				createPortal(
					<div
						role="menu"
						className="image-context-menu"
						style={{ left: menu.x, top: menu.y }}
						onPointerDown={(event) => event.stopPropagation()}
					>
						<button
							type="button"
							role="menuitem"
							autoFocus
							onClick={() => {
								setMenu(null)
								void openImage(true)
							}}
						>
							Layerize
						</button>
					</div>,
					document.body
				)}
			{error && <span role="alert">{error}</span>}
		</>
	)
}
