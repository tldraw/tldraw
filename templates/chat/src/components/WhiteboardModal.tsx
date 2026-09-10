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

	const handleSave = useCallback(async () => {
		if (!editor || saving.current) return
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
				padding: 24,
			})
			didAccept.current = true
			onAccept({
				id: imageId ?? crypto.randomUUID(),
				name: imageName ?? 'tldraw whiteboard.png',
				snapshot,
				type: 'image/png',
				...image,
			})
		} catch {
			setError('Could not attach the sketch. Please try again.')
		} finally {
			editor.updateInstanceState({ isReadonly: wasReadonly })
			saving.current = false
			setIsSaving(false)
		}
	}, [editor, imageId, imageName, onAccept, onCancel])

	// The sticky chat footer would trap the overlay beneath the window chrome.
	return createPortal(
		<div
			className="modal-overlay tl-theme__dark"
			onClick={(event) => {
				if (event.target === event.currentTarget) void handleSave()
			}}
		>
			<div
				className="whiteboard-surface"
				role="dialog"
				aria-modal="true"
				aria-label="Sketch whiteboard"
				aria-busy={isSaving}
				onKeyDown={(event) => {
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
						editor.setCurrentTool('draw')
					}}
				>
					<InsideOfTldrawContext uploadedFile={uploadedFile} />
					<WhiteboardControls
						pen={pen}
						onCancel={onCancel}
						onAccept={handleSave}
						isSaving={isSaving}
						error={error}
					/>
				</Tldraw>
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

function InsideOfTldrawContext({ uploadedFile }: { uploadedFile?: File }) {
	const toasts = useToasts()
	const msg = useTranslation()
	const editor = useEditor()

	useEffect(() => {
		if (!uploadedFile) return

		// this effect can run multiple times, but we only want the file to be uploaded once:
		if ((uploadedFile as any).didUpload) return
		;(uploadedFile as any).didUpload = true
		;(async () => {
			if (!notifyIfFileNotAllowed(editor, uploadedFile, { toasts, msg })) return

			const asset = await editor.getAssetForExternalContent({
				type: 'file',
				file: uploadedFile,
			})
			if (!asset || asset.type !== 'image') return

			const scale = Math.min(1000 / Math.max(asset.props.w, asset.props.h), 1)
			const center = editor.getViewportPageBounds().center
			const width = asset.props.w * scale
			const height = asset.props.h * scale

			const shapeId = createShapeId()

			editor
				.createAssets([asset])
				.createShape({
					id: shapeId,
					type: 'image',
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
				.setCurrentTool('select.crop')
		})()
	}, [uploadedFile, toasts, msg, editor])

	return null
}
