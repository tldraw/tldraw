import { T, TLShape, track, useEditor } from '@tldraw/editor'
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

type ShapeWithUrl = Extract<TLShape, { props: { url: string } }>

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

	if (!isShapeWithUrl(selectedShape)) {
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
		const urlValidResult = validateUrl(selectedShape.props.url)

		const initialValue =
			urlValidResult.isValid === true
				? urlValidResult.hasProtocol
					? selectedShape.props.url
					: 'https://' + selectedShape.props.url
				: 'https://'

		return {
			actual: initialValue,
			safe: initialValue,
			valid: true,
		}
	})

	const handleChange = useCallback((rawValue: string) => {
		// Just auto-correct double https:// from a bad paste.
		const fixedRawValue = rawValue.replace(/https?:\/\/(https?:\/\/)/, (_match, arg1) => {
			return arg1
		})

		const urlValidResult = validateUrl(fixedRawValue)

		const safeValue =
			urlValidResult.isValid === true
				? urlValidResult.hasProtocol
					? fixedRawValue
					: 'https://' + fixedRawValue
				: 'https://'

		setUrlInputState({
			actual: fixedRawValue,
			safe: safeValue,
			valid: urlValidResult.isValid,
		})
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

		// ? URL is a magic value
		if (onlySelectedShape && 'url' in onlySelectedShape.props) {
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
		}
		onClose()
	}, [editor, onClose, urlInputState])

	const handleCancel = useCallback(() => {
		onClose()
	}, [onClose])

	if (!selectedShape) {
		// dismiss modal
		onClose()
		return null
	}

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
					<TldrawUiButton type={'danger'} onTouchEnd={handleClear} onClick={handleClear}>
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
