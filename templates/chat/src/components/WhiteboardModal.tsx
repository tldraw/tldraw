import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	createShapeId,
	Editor,
	notifyIfFileNotAllowed,
	TLComponents,
	Tldraw,
	TldrawOptions,
	TldrawUiButton,
	TldrawUiRow,
	TLEditorSnapshot,
	useEditor,
	useToasts,
	useTranslation,
} from 'tldraw'

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
	// keep the action shortcuts in the top-right menu area, not on the toolbar
	actionShortcutsLocation: 'menu',
	// skip font pre-loading so the ui doesn't pop in after the modal appears
	maxFontsToLoadBeforeRender: 0,
}

export function WhiteboardModal({
	initialSnapshot,
	onCancel,
	onAccept,
	imageId,
	uploadedFile,
	imageName,
}: WhiteboardModalProps) {
	const [editor, setEditor] = useState<Editor | null>(null)

	const handleSave = useCallback(async () => {
		if (!editor) return

		const shapes = editor.getCurrentPageShapes()
		if (shapes.length === 0) {
			onCancel()
			return
		}

		const image = await editor.toImageDataUrl(shapes, { format: 'png' })

		// the snapshot lets the image be re-opened and edited later
		onAccept({
			id: imageId ?? crypto.randomUUID(),
			name: imageName ?? 'tldraw whiteboard.png',
			snapshot: editor.getSnapshot(),
			type: 'image/png',
			...image,
		})
	}, [onCancel, onAccept, imageId, imageName, editor])

	// components must be memoized (or defined outside the component) or tldraw remounts them every render
	const components = useMemo(
		(): TLComponents => ({
			// the share panel is in the top-right of the editor; we use it for our save and cancel buttons
			SharePanel: () => (
				<TldrawUiRow className="whiteboard-actions">
					<TldrawUiButton type="normal" onClick={onCancel}>
						Cancel
					</TldrawUiButton>
					<TldrawUiButton type="primary" onClick={handleSave}>
						{imageId ? 'Save' : 'Add'}
					</TldrawUiButton>
				</TldrawUiRow>
			),
		}),
		[onCancel, handleSave, imageId]
	)

	// clicking outside the modal saves rather than discards - the image is easy to delete if unwanted
	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			handleSave()
		}
	}

	return (
		<div className="modal-overlay" onClick={handleOverlayClick}>
			<Tldraw
				components={components}
				forceMobile
				options={options}
				snapshot={initialSnapshot}
				onMount={(editor) => {
					setEditor(editor)

					editor.user.updateUserPreferences({ colorScheme: 'light' })
					editor.selectNone()
					editor.zoomToSelection()
				}}
			>
				{/* rendered inside Tldraw so it can use the editor and ui hooks (e.g. toasts) */}
				<InsideOfTldrawContext uploadedFile={uploadedFile} />
			</Tldraw>
		</div>
	)
}

function InsideOfTldrawContext({ uploadedFile }: { uploadedFile?: File }) {
	const toasts = useToasts()
	const msg = useTranslation()
	const editor = useEditor()

	useEffect(() => {
		if (!uploadedFile) return

		// this effect can run multiple times, but the file must only be inserted once
		if ((uploadedFile as any).didUpload) return
		;(uploadedFile as any).didUpload = true
		;(async () => {
			if (!notifyIfFileNotAllowed(editor, uploadedFile, { toasts, msg })) return

			const asset = await editor.getAssetForExternalContent({
				type: 'file',
				file: uploadedFile,
			})
			if (!asset || asset.type !== 'image') return

			// scale down so the max dimension is 1000px
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
