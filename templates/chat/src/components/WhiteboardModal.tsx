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

const commentTools = [
	CommentTool.configure({
		canComment: ({ editor, currentUserId }) => !!currentUserId && !editor.getIsReadonly(),
	}),
]
const commentOverrides = [commentToolOverrides]

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
	const [returnFocus] = useState(() => document.activeElement)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const saving = useRef(false)
	const didAccept = useRef(false)
	const pen = useRef<WhiteboardPen>({ color: '#0d0d0d', width: 4 })

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

	const handleSave = useCallback(
		async (destination: 'attach' | 'send' = 'attach') => {
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
			} catch {
				setError('Could not attach the sketch. Please try again.')
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
						if (imageEditor && mode === 'markup') setMode('edit')
						else onCancel()
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
							onClick={onCancel}
							disabled={isSaving}
						>
							<XIcon />
						</button>
						<span>{imageName || 'Generated image'}</span>
						<button
							type="button"
							className="image-editor-attach"
							onClick={() => void handleSave()}
							disabled={!ready || isSaving}
						>
							Attach to chat
						</button>
					</header>
				)}
				<div className={imageEditor ? 'image-editor-canvas' : undefined}>
					<Tldraw
						components={components}
						options={options}
						store={store}
						tools={commentTools}
						overrides={commentOverrides}
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
							if (initialSnapshot) editor.zoomToFit({ animation: { duration: 0 } })
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
								onCancel={imageEditor ? () => setMode('edit') : onCancel}
								onAccept={imageEditor ? () => setMode('edit') : () => void handleSave()}
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
							if (ready && instructions.trim() && !waitingForResponse && !isSaving)
								void handleSave('send')
						}}
					>
						{error && <p role="alert">{error}</p>}
						<div className="chat-input-row">
							<input
								className="chat-input"
								aria-label="Image edit instructions"
								placeholder={mode === 'markup' ? 'Add instructions' : 'Describe edits'}
								value={instructions}
								onChange={(event) => setInstructions(event.target.value)}
								disabled={isSaving}
							/>
							<button
								type="submit"
								className="icon-button composer-send"
								aria-label="Send image edits"
								disabled={!ready || !instructions.trim() || waitingForResponse || isSaving}
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
	return (
		<>
			{mode === 'edit' && (
				<div className="image-editor-toolbar" role="toolbar" aria-label="Image editing tools">
					<button type="button" onClick={() => onMarkup('draw')} disabled={!ready}>
						<ComposerIcon name="sketch" />
						Markup
					</button>
					<button type="button" onClick={() => onMarkup('comment')} disabled={!ready}>
						<ComposerIcon name="write" />
						Comment
					</button>
					<button type="button" disabled title="Background removal is not available yet">
						Remove BG
					</button>
					<button type="button" disabled title="Image erasing is not available yet">
						Erase
					</button>
					<button type="button" disabled title="Image resizing is not available yet">
						Resize
					</button>
				</div>
			)}
			<button
				type="button"
				className="image-editor-zoom"
				title="Fit image to view"
				onClick={() => editor.zoomToFit()}
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
				editor.selectNone().zoomToFit()
				editor.clearHistory()
			}
			onReady()
		})().catch(onError)
	}, [uploadedFile, toasts, msg, editor, imageEditor, onReady, onError])

	return null
}
