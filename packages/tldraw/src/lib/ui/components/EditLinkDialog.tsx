import { ExtractShapeByProps, T, TLShape, track, useEditor } from '@tldraw/editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TLUiDialogProps } from '../context/dialogs'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'
import { TldrawUiButtonLabel } from './primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from './primitives/TldrawUiDialog'
import { TldrawUiInput } from './primitives/TldrawUiInput'

// A url can either be invalid, or valid with a protocol, or valid without a protocol.
// For example, "aol.com" would be valid with a protocol ()
function validateUrl(url: string) {
	if (T.linkUrl.isValid(url)) {
		return { isValid: true, hasProtocol: true }
	}
	if (T.linkUrl.isValid('https://' + url)) {
		return { isValid: true, hasProtocol: false }
	}
	return { isValid: false, hasProtocol: false }
}

function getUrlInputState(url: string) {
	const { isValid, hasProtocol } = validateUrl(url)
	const safe = isValid ? (hasProtocol ? url : 'https://' + url) : 'https://'
	return { actual: url, safe, valid: isValid }
}

type ShapeWithUrl = ExtractShapeByProps<{ url: string }>

function isShapeWithUrl(shape: TLShape | null | undefined): shape is ShapeWithUrl {
	return !!(shape && 'url' in shape.props && typeof shape.props.url === 'string')
}

function assertShapeWithUrl(shape: TLShape | null | undefined): asserts shape is ShapeWithUrl {
	if (!isShapeWithUrl(shape)) {
		throw new Error('Shape is not a valid ShapeWithUrl')
	}
}

export const EditLinkDialog = track(function EditLinkDialog({ onClose }: TLUiDialogProps) {
	const editor = useEditor()

	const selectedShape = editor.getOnlySelectedShape()
	const hasShapeWithUrl = isShapeWithUrl(selectedShape)

	// The shape can be deleted or deselected from under the open dialog (a collaborator, or a
	// keypress reaching the canvas). Returning null on its own would leave an empty dialog frame.
	useEffect(() => {
		if (!hasShapeWithUrl) onClose()
	}, [hasShapeWithUrl, onClose])

	if (!hasShapeWithUrl) {
		return null
	}

	return <EditLinkDialogInner onClose={onClose} selectedShape={selectedShape} />
})

export const EditLinkDialogInner = track(function EditLinkDialogInner({
	onClose,
	selectedShape,
}: TLUiDialogProps & { selectedShape: ShapeWithUrl }) {
	const editor = useEditor()
	const msg = useTranslation()

	const rInput = useRef<HTMLInputElement>(null)

	useEffect(() => {
		editor.timers.requestAnimationFrame(() => rInput.current?.focus())
	}, [editor])

	const rInitialValue = useRef(selectedShape.props.url)

	const [urlInputState, setUrlInputState] = useState(() => {
		const { safe } = getUrlInputState(selectedShape.props.url)
		return { actual: safe, safe, valid: true }
	})

	const handleChange = useCallback((rawValue: string) => {
		// Just auto-correct double https:// from a bad paste.
		const fixedRawValue = rawValue.replace(/https?:\/\/(https?:\/\/)/, '$1')
		setUrlInputState(getUrlInputState(fixedRawValue))
	}, [])

	const handleClear = useCallback(() => {
		const onlySelectedShape = editor.getOnlySelectedShape()
		if (!onlySelectedShape) return
		assertShapeWithUrl(onlySelectedShape)
		editor.updateShapes([
			{ id: onlySelectedShape.id, type: onlySelectedShape.type, props: { url: '' } },
		])
		onClose()
	}, [editor, onClose])

	const handleComplete = useCallback(() => {
		const onlySelectedShape = editor.getOnlySelectedShape()

		if (!onlySelectedShape) return
		assertShapeWithUrl(onlySelectedShape)

		// Here would be a good place to validate the next shape—would setting the empty
		if (onlySelectedShape.props.url !== urlInputState.safe) {
			editor.updateShapes([
				{
					id: onlySelectedShape.id,
					type: onlySelectedShape.type,
					props: { url: urlInputState.safe },
				},
			])
		}
		onClose()
	}, [editor, onClose, urlInputState])

	const handleCancel = useCallback(() => {
		onClose()
	}, [onClose])

	// Are we going from a valid state to an invalid state?
	const isRemoving = rInitialValue.current && !urlInputState.valid

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{msg('edit-link-dialog.title')}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<div className="tlui-edit-link-dialog">
					<TldrawUiInput
						ref={rInput}
						className="tlui-edit-link-dialog__input"
						label="edit-link-dialog.url"
						autoFocus
						autoSelect
						placeholder="https://example.com"
						value={urlInputState.actual}
						onValueChange={handleChange}
						onComplete={handleComplete}
						onCancel={handleCancel}
					/>
					<div>
						{urlInputState.valid
							? msg('edit-link-dialog.detail')
							: msg('edit-link-dialog.invalid-url')}
					</div>
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={handleCancel} onTouchEnd={handleCancel}>
					<TldrawUiButtonLabel>{msg('edit-link-dialog.cancel')}</TldrawUiButtonLabel>
				</TldrawUiButton>
				{isRemoving ? (
					<TldrawUiButton type="danger" onTouchEnd={handleClear} onClick={handleClear}>
						<TldrawUiButtonLabel>{msg('edit-link-dialog.clear')}</TldrawUiButtonLabel>
					</TldrawUiButton>
				) : (
					<TldrawUiButton
						type="primary"
						disabled={!urlInputState.valid}
						onTouchEnd={handleComplete}
						onClick={handleComplete}
					>
						<TldrawUiButtonLabel>{msg('edit-link-dialog.save')}</TldrawUiButtonLabel>
					</TldrawUiButton>
				)}
			</TldrawUiDialogFooter>
		</>
	)
})
