import {
	CanvasComments,
	CommentTool,
	commentToolOverrides,
	getLiveCommentThreads,
} from '@tldraw/commenting'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	commentSchemaRecords,
	createShapeId,
	createTLSchema,
	createTLStore,
	DefaultColorStyle,
	Editor,
	FileHelpers,
	isEqual,
	notifyIfFileNotAllowed,
	TLComponents,
	Tldraw,
	TldrawOptions,
	TLEditorSnapshot,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import { ComposerIcon } from './ComposerIcon'
import { ExtractLassoOverlayUtil, ExtractTool, extractToolOverrides } from './ExtractTool'
import { SendIcon } from './icons/SendIcon'
import { XIcon } from './icons/XIcon'
import { WhiteboardControls } from './WhiteboardControls'
import {
	supportsWhiteboardPen,
	whiteboardShapeUtils,
	whiteboardThemes,
	WhiteboardPen,
} from './whiteboardTheme'

export interface TldrawProviderMetadata {
	snapshot: TLEditorSnapshot
	imageName: string
}

export interface WhiteboardImage {
	id: string
	name: string
	url: string
	snapshot: TLEditorSnapshot
	type: string
	width: number
	height: number
}

interface WhiteboardModalProps {
	imageEditor?: boolean
	onSendMessage?: (text: string, images: WhiteboardImage[]) => void
	waitingForResponse?: boolean
	initialSnapshot?: TLEditorSnapshot
	onCancel: () => void
	onAccept: (image: WhiteboardImage) => void
	imageId?: string
	uploadedFile?: File
	imageName?: string
}

const options: Partial<TldrawOptions> = {
	maxPages: 1,
	maxFontsToLoadBeforeRender: 0,
}

const whiteboardTools = [
	CommentTool.configure({
		canComment: ({ editor, currentUserId }) => !!currentUserId && !editor.getIsReadonly(),
	}),
	ExtractTool,
]
const whiteboardOverrides = [commentToolOverrides, extractToolOverrides]
const overlayUtils = [ExtractLassoOverlayUtil]

const components: TLComponents = {
	InFrontOfTheCanvas: WhiteboardComments,
	Toolbar: null,
	StylePanel: null,
	MenuPanel: null,
	NavigationPanel: null,
	HelpMenu: null,
	HelperButtons: null,
	TopPanel: null,
	SharePanel: null,
	QuickActions: null,
	DebugPanel: null,
	FollowingIndicator: null,
}

export function WhiteboardModal({
	initialSnapshot,
	imageEditor = false,
	onSendMessage,
	waitingForResponse = false,
	onCancel,
	onAccept,
	imageId,
	uploadedFile,
	imageName,
}: WhiteboardModalProps) {
	const [store] = useState(() =>
		createTLStore({
			schema: createTLSchema({ records: commentSchemaRecords }),
			snapshot: initialSnapshot,
			themes: whiteboardThemes,
		})
	)
	const [mode, setMode] = useState<'edit' | 'markup'>(imageEditor ? 'edit' : 'markup')
	const [markupTool, setMarkupTool] = useState('draw')
	const [instructions, setInstructions] = useState('')
	const [ready, setReady] = useState(!uploadedFile)
	const [editor, setEditor] = useState<Editor | null>(null)
	const [baseline, setBaseline] = useState<TLEditorSnapshot | null>(null)
	const [returnFocus] = useState(() => document.activeElement)
	const [isSaving, setIsSaving] = useState(false)
	const [notice, setNotice] = useState<string | null>(null)
	const uploadInput = useRef<HTMLInputElement>(null)
	const [error, setError] = useState<string | null>(null)
	const saving = useRef(false)
	const didAccept = useRef(false)
	const pen = useRef<WhiteboardPen>({ color: imageEditor ? '#e02020' : '#0d0d0d', width: 4 })

	useEffect(() => {
		const overflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = overflow
			if (!didAccept.current && returnFocus instanceof HTMLElement && returnFocus.isConnected)
				returnFocus.focus()
		}
	}, [returnFocus])

	useEffect(() => {
		if (!imageEditor || !editor || !ready) return
		editor.complete().selectNone()
		editor.updateInstanceState({ isReadonly: mode === 'edit' })
		editor.setCurrentTool(mode === 'edit' ? 'hand' : markupTool)
	}, [editor, mode, ready, imageEditor, markupTool])

	useEffect(() => {
		if (imageEditor && editor && ready && !baseline) setBaseline(editor.getSnapshot())
	}, [imageEditor, editor, ready, baseline])

	const hasMarkup = useValue(
		'unsent image markup',
		() => !!baseline && !isEqual(store.serialize('document'), baseline.document.store),
		[store, baseline]
	)
	const canSend = ready && !waitingForResponse && !isSaving && (hasMarkup || !!instructions.trim())

	function requestClose(destination: 'chat' | 'edit') {
		if (saving.current) return
		if (
			imageEditor &&
			(hasMarkup || instructions.trim()) &&
			!window.confirm('Discard your unsent changes?')
		)
			return
		if (destination === 'chat') {
			onCancel()
		} else {
			if (editor && baseline) {
				editor.loadSnapshot(baseline)
				editor.clearHistory()
			}
			setInstructions('')
			setMode('edit')
		}
	}

	const handleSave = useCallback(
		async (destination: 'attach' | 'send' | 'download' | 'share' = 'attach') => {
			if (!editor || !ready || saving.current) return
			editor.complete()
			const shapes = editor.getCurrentPageShapes()
			if (shapes.length === 0) {
				// Native comment pins are not shapes, so they cannot produce an image attachment alone.
				if (getLiveCommentThreads(editor).length > 0) {
					setError('Add a drawing before attaching this sketch.')
					return
				}
				onCancel()
				return
			}
			saving.current = true
			setIsSaving(true)
			setError(null)
			setNotice(null)
			const snapshot = editor.getSnapshot()
			const wasReadonly = editor.getInstanceState().isReadonly
			editor.updateInstanceState({ isReadonly: true })
			try {
				const image = await editor.toImageDataUrl(shapes, {
					format: 'png',
					background: true,
					darkMode: false,
					padding: imageEditor ? 0 : 24,
				})
				if (destination === 'download') {
					const link = document.createElement('a')
					link.href = image.url
					link.download = (imageName || 'image').replace(/\.[^.]+$/, '') + '.png'
					link.click()
					return
				}
				if (destination === 'share') {
					const blob = await FileHelpers.urlToBlob(image.url)
					const file = new File([blob], 'image.png', { type: 'image/png' })
					if (navigator.canShare?.({ files: [file] })) {
						await navigator.share({ files: [file], title: imageName || 'Image' })
					} else {
						await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
						setNotice('Image copied. Paste it to share.')
					}
					return
				}
				didAccept.current = true
				const attachment: WhiteboardImage = {
					id: imageId ?? crypto.randomUUID(),
					name: imageName ?? 'tldraw whiteboard.png',
					snapshot,
					type: 'image/png',
					...image,
				}
				if (destination === 'send' && onSendMessage)
					onSendMessage(instructions.trim(), [attachment])
				else onAccept(attachment)
			} catch (error) {
				if (!(error instanceof DOMException && error.name === 'AbortError'))
					setError(
						destination === 'share'
							? 'Could not share the image. Try downloading it instead.'
							: 'Could not export the image. Please try again.'
					)
			} finally {
				editor.updateInstanceState({ isReadonly: wasReadonly })
				saving.current = false
				setIsSaving(false)
			}
		},
		[
			editor,
			imageId,
			imageName,
			onAccept,
			onCancel,
			imageEditor,
			instructions,
			onSendMessage,
			ready,
		]
	)

	// The sticky chat footer would trap the overlay beneath the window chrome.
	return createPortal(
		<div
			className={`modal-overlay tl-theme__light${imageEditor ? ' image-editor-overlay' : ''}`}
			onClick={(event) => {
				if (event.target === event.currentTarget) void handleSave()
			}}
		>
			<div
				className={`whiteboard-surface${imageEditor ? ' image-editor-surface' : ''}`}
				role="dialog"
				aria-modal="true"
				aria-label={imageEditor ? 'Image editor' : 'Sketch whiteboard'}
				aria-busy={isSaving}
				onKeyDown={(event) => {
					if (
						event.key === 'Escape' &&
						!isSaving &&
						!(event.target instanceof HTMLInputElement) &&
						!(event.target instanceof HTMLTextAreaElement)
					) {
						requestClose(imageEditor && mode === 'markup' ? 'edit' : 'chat')
						return
					}
					if (event.key !== 'Tab') return
					const focusable = [
						...event.currentTarget.querySelectorAll<HTMLElement>(
							'button:not(:disabled), input:not(:disabled), [tabindex="0"], [contenteditable="true"]'
						),
					].filter((element) => element.getClientRects().length > 0 && !element.closest('[inert]'))
					const first = focusable[0]
					const last = focusable[focusable.length - 1]
					if (
						event.shiftKey &&
						(document.activeElement === first ||
							!focusable.includes(document.activeElement as HTMLElement))
					) {
						event.preventDefault()
						last?.focus()
					} else if (!event.shiftKey && document.activeElement === last) {
						event.preventDefault()
						first?.focus()
					}
				}}
			>
				{imageEditor && (
					<header className="image-editor-header">
						<button
							type="button"
							className="icon-button"
							aria-label="Close image editor"
							onClick={() => requestClose('chat')}
							disabled={isSaving}
						>
							<XIcon />
						</button>
						<span>
							{imageName?.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Generated image'}
						</span>
						<button
							type="button"
							className="image-editor-share"
							onClick={() => void handleSave('share')}
							disabled={!ready || isSaving}
						>
							Share
						</button>
						<button
							type="button"
							className="icon-button"
							aria-label="Download image"
							disabled={!ready || isSaving}
							onClick={() => void handleSave('download')}
						>
							<ComposerIcon name="download" />
						</button>
						<details className="image-editor-more">
							<summary className="icon-button" aria-label="Image options">
								<ComposerIcon name="more" />
							</summary>
							<button type="button" disabled={!ready || isSaving} onClick={() => void handleSave()}>
								Attach to chat
							</button>
						</details>
					</header>
				)}
				<div className={imageEditor ? 'image-editor-canvas' : undefined}>
					<Tldraw
						components={components}
						options={options}
						store={store}
						tools={whiteboardTools}
						overrides={whiteboardOverrides}
						overlayUtils={overlayUtils}
						licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
						shapeUtils={whiteboardShapeUtils}
						themes={whiteboardThemes}
						colorScheme="light"
						autoFocus
						onMount={(editor) => {
							setEditor(editor)
							editor.user.updateUserPreferences({ colorScheme: 'light' })
							editor.updateInstanceState({ isGridMode: false })
							editor.setStyleForNextShapes(DefaultColorStyle, 'black')
							editor.getInitialMetaForShape = (shape) =>
								supportsWhiteboardPen(shape)
									? { strokeColor: pen.current.color, strokeWidth: pen.current.width }
									: {}
							editor.selectNone()
							if (initialSnapshot) {
								if (imageEditor) fitImageToView(editor)
								else editor.zoomToFit({ animation: { duration: 0 } })
							}
							editor.setCurrentTool(imageEditor ? 'hand' : 'draw')
						}}
					>
						<InsideOfTldrawContext
							uploadedFile={uploadedFile}
							imageEditor={imageEditor}
							onReady={() => setReady(true)}
							onError={() => setError('Could not load the image. Close this view and try again.')}
						/>
						{imageEditor && (
							<ImageEditorNavigation
								mode={mode}
								onMarkup={(tool) => {
									setMarkupTool(tool)
									setMode('markup')
								}}
								ready={ready && !isSaving}
							/>
						)}
						{mode === 'markup' && (
							<WhiteboardControls
								pen={pen}
								imageEditor={imageEditor}
								onCancel={() => requestClose(imageEditor ? 'edit' : 'chat')}
								onAccept={() => void handleSave()}
								isSaving={isSaving}
								error={error}
							/>
						)}
					</Tldraw>
				</div>
				{imageEditor && (
					<form
						className="image-editor-composer chat-input-form"
						onSubmit={(event) => {
							event.preventDefault()
							event.stopPropagation()
							if (canSend) void handleSave('send')
						}}
					>
						{error && <p role="alert">{error}</p>}
						{notice && <p role="status">{notice}</p>}
						<div className="chat-input-row">
							<button
								type="button"
								className="icon-button"
								aria-label="Add image"
								disabled={!ready || isSaving}
								onClick={() => uploadInput.current?.click()}
							>
								<ComposerIcon name="plus" />
							</button>
							<input
								ref={uploadInput}
								type="file"
								accept="image/*"
								hidden
								onChange={async (event) => {
									const file = event.currentTarget.files?.[0]
									event.currentTarget.value = ''
									if (!file || !editor || saving.current) return
									saving.current = true
									setIsSaving(true)
									const wasReadonly = editor.getIsReadonly()
									editor.updateInstanceState({ isReadonly: false })
									try {
										await editor.putExternalContent({ type: 'files', files: [file] })
									} catch {
										setError('Could not add the image. Please try again.')
									} finally {
										editor.updateInstanceState({ isReadonly: wasReadonly })
										saving.current = false
										setIsSaving(false)
									}
								}}
							/>
							<input
								className="chat-input"
								aria-label="Image edit instructions"
								placeholder={mode === 'markup' ? 'Add instructions' : 'Describe edits'}
								value={instructions}
								onChange={(event) => setInstructions(event.target.value)}
								disabled={isSaving}
							/>
							<span className="composer-effort" aria-hidden="true">
								Medium <ComposerIcon name="chevron" />
							</span>
							<span className="icon-button composer-decoration" aria-hidden="true">
								<ComposerIcon name="microphone" />
							</span>
							<button
								type="submit"
								className="icon-button composer-send"
								aria-label="Send image edits"
								disabled={!canSend}
							>
								<SendIcon />
							</button>
						</div>
					</form>
				)}
			</div>
		</div>,
		document.body
	)
}

function WhiteboardComments() {
	const editor = useEditor()
	const author = useValue(
		'comment author',
		() => ({
			id: editor.user.getExternalId(),
			name: editor.user.getName() || 'You',
			color: editor.user.getColor(),
		}),
		[editor]
	)
	const resolveAuthor = useCallback(
		(id: string) => (id === author.id ? author : undefined),
		[author]
	)
	return <CanvasComments currentUserId={author.id} resolveAuthor={resolveAuthor} />
}

function ImageEditorNavigation({
	mode,
	onMarkup,
	ready,
}: {
	mode: 'edit' | 'markup'
	onMarkup: (tool: 'draw' | 'comment') => void
	ready: boolean
}) {
	const editor = useEditor()
	const zoom = useValue('image zoom', () => Math.round(editor.getZoomLevel() * 100), [editor])
	useEffect(() => {
		const observer = new ResizeObserver(() => fitImageToView(editor))
		observer.observe(editor.getContainer())
		return () => observer.disconnect()
	}, [editor])
	return (
		<>
			{mode === 'edit' && (
				<div className="image-editor-toolbar" role="toolbar" aria-label="Image editing tools">
					<button type="button" onClick={() => onMarkup('draw')} disabled={!ready}>
						<ComposerIcon name="sketch" />
						Markup
					</button>
					<button type="button" onClick={() => onMarkup('comment')} disabled={!ready}>
						<ComposerIcon name="comment" />
						Comment
					</button>
					<button type="button" disabled title="Background removal is not available yet">
						<ComposerIcon name="remove-background" />
						Remove BG
					</button>
					<button type="button" disabled title="Image erasing is not available yet">
						<ComposerIcon name="erase" />
						Erase
					</button>
					<button type="button" disabled title="Image resizing is not available yet">
						<ComposerIcon name="resize" />
						Resize
					</button>
				</div>
			)}
			<button
				type="button"
				className="image-editor-zoom"
				title="Fit image to view"
				onClick={() => fitImageToView(editor)}
			>
				{zoom}% <ComposerIcon name="chevron" />
			</button>
		</>
	)
}

function InsideOfTldrawContext({
	uploadedFile,
	imageEditor,
	onReady,
	onError,
}: {
	uploadedFile?: File
	imageEditor: boolean
	onReady: () => void
	onError: () => void
}) {
	const imported = useRef(false)
	const toasts = useToasts()
	const msg = useTranslation()
	const editor = useEditor()

	useEffect(() => {
		if (!uploadedFile) return

		// this effect can run multiple times, but we only want the file to be uploaded once:
		if (imported.current) return
		imported.current = true
		;(async () => {
			if (!notifyIfFileNotAllowed(editor, uploadedFile, { toasts, msg })) {
				onError()
				return
			}

			const asset = await editor.getAssetForExternalContent({
				type: 'file',
				file: uploadedFile,
			})
			if (!asset || asset.type !== 'image') {
				onError()
				return
			}
			if (editor.isDisposed) return

			const scale = imageEditor ? 1 : Math.min(1000 / Math.max(asset.props.w, asset.props.h), 1)
			const center = editor.getViewportPageBounds().center
			const width = asset.props.w * scale
			const height = asset.props.h * scale

			const shapeId = createShapeId()

			editor
				.createAssets([asset])
				.createShape({
					id: shapeId,
					type: 'image',
					isLocked: imageEditor,
					x: center.x - width / 2,
					y: center.y - height / 2,
					props: {
						assetId: asset.id,
						w: width,
						h: height,
					},
				})
				.setSelectedShapes([shapeId])
				.zoomToSelection()
				.setCurrentTool(imageEditor ? 'hand' : 'select.crop')
			if (imageEditor) {
				editor.selectNone()
				fitImageToView(editor)
				editor.clearHistory()
			}
			onReady()
		})().catch(onError)
	}, [uploadedFile, toasts, msg, editor, imageEditor, onReady, onError])

	return null
}

function fitImageToView(editor: Editor) {
	editor.updateViewportScreenBounds(editor.getContainer())
	const bounds = editor.getCurrentPageBounds()
	if (!bounds) return
	const viewport = editor.getViewportScreenBounds()
	editor.zoomToBounds(bounds, {
		inset: Math.min(144, viewport.w * 0.28),
		animation: { duration: 0 },
	})
	// Leave space below the floating toolbar without changing the image's page coordinates.
	const camera = editor.getCamera()
	editor.setCamera({ ...camera, y: camera.y + 24 / camera.z })
}
