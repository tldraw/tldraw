import { useEffect, useMemo } from 'react'
import {
	createShapeId,
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

export interface WhiteboardImage {
	id: string
	url: string
	snapshot: TLEditorSnapshot
	type: string
	width: number
	height: number
}

export interface WhiteboardModalCloseResult {
	type: 'close'
}
export interface WhiteBoardModalAcceptResult {
	type: 'accept'
	image: WhiteboardImage
}

export type WhiteboardModalResult = WhiteboardModalCloseResult | WhiteBoardModalAcceptResult

interface WhiteboardModalProps {
	initialSnapshot?: TLEditorSnapshot
	onClose: (result: WhiteboardModalResult) => void
	imageId?: string
	uploadedFile?: File
}

const options: Partial<TldrawOptions> = {
	maxPages: 1,
	actionShortcutsLocation: 'menu',
	// disable font pre-loading to avoid the ui popping in after the modal appears
	maxFontsToLoadBeforeRender: 0,
}

export function WhiteboardModal({
	initialSnapshot,
	onClose,
	imageId,
	uploadedFile,
}: WhiteboardModalProps) {
	const components = useMemo(
		(): TLComponents => ({
			SharePanel: () => {
				const editor = useEditor()
				return (
					<TldrawUiRow className="whiteboard-actions">
						<TldrawUiButton type="normal" onClick={() => onClose({ type: 'close' })}>
							Cancel
						</TldrawUiButton>
						<TldrawUiButton
							type="primary"
							onClick={async () => {
								const image = await editor.toImageDataUrl(editor.getCurrentPageShapes(), {
									format: 'png',
								})
								onClose({
									type: 'accept',
									image: {
										id: imageId ?? crypto.randomUUID(),
										snapshot: editor.getSnapshot(),
										type: 'image/png',
										...image,
									},
								})
							}}
						>
							{imageId ? 'Save' : 'Add'}
						</TldrawUiButton>
					</TldrawUiRow>
				)
			},
		}),
		[onClose, imageId]
	)

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose({ type: 'close' })
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
					editor.user.updateUserPreferences({ colorScheme: 'light' })
				}}
			>
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
			const isOk = notifyIfFileNotAllowed(uploadedFile, {
				toasts,
				msg,
			})
			if (!isOk) return

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
			const shapeId = createShapeId()
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

			editor.getContainer().focus()
		})()
	}, [uploadedFile, toasts, msg, editor])

	return null
}
