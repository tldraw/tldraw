import { useMemo } from 'react'
import {
	TLComponents,
	Tldraw,
	TldrawOptions,
	TldrawUiButton,
	TldrawUiRow,
	TLEditorSnapshot,
	useEditor,
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
}

const options: Partial<TldrawOptions> = {
	maxPages: 1,
	actionShortcutsLocation: 'menu',
	// disable font pre-loading to avoid the ui popping in after the modal appears
	maxFontsToLoadBeforeRender: 0,
}

export function WhiteboardModal({ initialSnapshot, onClose, imageId }: WhiteboardModalProps) {
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
			/>
		</div>
	)
}
