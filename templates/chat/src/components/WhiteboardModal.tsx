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
	TLImageShape,
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
	// disable the ability to create new pages:
	maxPages: 1,
	// make sure the action shortcuts are always in the top-right menu area, not on the toolbar:
	actionShortcutsLocation: 'menu',
	// disable font pre-loading to avoid the ui popping in after the modal appears:
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

		// if there are no shapes, we don't want to save the image:
		const shapes = editor.getCurrentPageShapes()
		if (shapes.length === 0) {
			onCancel()
			return
		}

		// when the user clicks save, we convert the current whiteboard to an image:
		const image = await editor.toImageDataUrl(shapes, {
			format: 'png',
		})

		// we also take a snapshot of the editor state, so we can still edit
		// it if we open it up again later:
		const snapshot = editor.getSnapshot()

		// we pass the image data and the snapshot to the parent component, so it
		// can add it to the chat input:
		onAccept({
			id: imageId ?? crypto.randomUUID(),
			name: imageName ?? 'tldraw whiteboard.png',
			snapshot,
			type: 'image/png',
			...image,
		})
	}, [onCancel, onAccept, imageId, imageName, editor])

	// components are used to override parts of the tldraw ui. they shouldn't change often, so it's
	// important that we memoize them or define them outside the tldraw component.
	const components = useMemo(
		(): TLComponents => ({
			// The "SharePanel" is in the top-right of the editor. Here we want it to show our save
			// and cancel buttons:
			SharePanel: () => {
				return (
					<TldrawUiRow className="whiteboard-actions">
						<TldrawUiButton type="normal" onClick={onCancel}>
							Cancel
						</TldrawUiButton>
						<TldrawUiButton type="primary" onClick={handleSave}>
							{imageId ? 'Save' : 'Add'}
						</TldrawUiButton>
					</TldrawUiRow>
				)
			},
		}),
		[onCancel, handleSave, imageId]
	)

	// when the user clicks outside the modal, we close it. we add their image to the chat input in
	// case they wanted it - they can easily delete it if not.
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
				{/* if the user uploaded a file, we insert it in a special component. this means we
				can use hooks that depend on tldraw's ui to do things like show a toast if
				something goes wrong. */}
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

		// this effect can run multiple times, but we only want the file to be uploaded once:
		if ((uploadedFile as any).didUpload) return
		;(uploadedFile as any).didUpload = true
		;(async () => {
			// we check if the file is allowed to be uploaded:
			const isOk = notifyIfFileNotAllowed(uploadedFile, {
				toasts,
				msg,
			})
			if (!isOk) return

			// we get the asset for the uploaded file:
			const asset = await editor.getAssetForExternalContent({
				type: 'file',
				file: uploadedFile,
			})
			if (!asset || asset.type !== 'image') return

			// scale so the max dimension is 1000px:
			const scale = Math.min(1000 / Math.max(asset.props.w, asset.props.h), 1)
			const center = editor.getViewportPageBounds().center
			const width = asset.props.w * scale
			const height = asset.props.h * scale

			// create an ID for the new shape so we can select it later:
			const shapeId = createShapeId()

			// create the shape, select it, make it fill the screen, and start cropping it:
			editor
				.createAssets([asset])
				.createShape<TLImageShape>({
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
