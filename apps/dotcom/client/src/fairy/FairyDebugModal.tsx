import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'

export function FairyDebugModal({ onClose }: { onClose(): void }) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Fairy Debug Actions</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 400 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					{/* <TldrawUiButton type="low" onClick={handleDebugSystemPrompt}>
						<TldrawUiButtonLabel>Print system prompt with randomized flags</TldrawUiButtonLabel>
					</TldrawUiButton> */}
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>Close</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
