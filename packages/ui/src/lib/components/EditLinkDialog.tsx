import { TLBaseShape, TLBookmarkUtil, useEditor } from '@tldraw/editor'
import { useCallback, useRef, useState } from 'react'
import { track } from 'signia-react'
import { TLUiDialogProps } from '../hooks/useDialogsProvider'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'
import * as Dialog from './primitives/Dialog'
import { Input } from './primitives/Input'

const validUrlRegex = new RegExp(
	/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i
)

// A url can either be invalid, or valid with a protocol, or valid without a protocol.
// For example, "aol.com" would be valid with a protocol ()
function validateUrl(url: string) {
	if (validUrlRegex.test(url)) return true
	if (validUrlRegex.test('https://' + url)) return 'needs protocol'
	return false
}

type ShapeWithUrl = TLBaseShape<string, { url: string }>

export const EditLinkDialog = track(function EditLinkDialog({ onClose }: TLUiDialogProps) {
	const editor = useEditor()

	const selectedShape = editor.onlySelectedShape

	if (
		!(selectedShape && 'url' in selectedShape.props && typeof selectedShape.props.url === 'string')
	) {
		return null
	}

	return <EditLinkDialogInner onClose={onClose} selectedShape={selectedShape as ShapeWithUrl} />
})

export const EditLinkDialogInner = track(function EditLinkDialogInner({
	onClose,
	selectedShape,
}: TLUiDialogProps & { selectedShape: ShapeWithUrl }) {
	const editor = useEditor()
	const msg = useTranslation()

	const [validState, setValid] = useState(validateUrl(selectedShape.props.url))

	const rInitialValue = useRef(selectedShape.props.url)

	const rValue = useRef(selectedShape.props.url)
	const [urlValue, setUrlValue] = useState<string>(
		validState
			? validState === 'needs protocol'
				? 'https://' + selectedShape.props.url
				: selectedShape.props.url
			: 'https://'
	)

	const handleChange = useCallback((rawValue: string) => {
		// Just auto-correct double https:// from a bad paste.
		const value = rawValue.replace(/https?:\/\/(https?:\/\/)/, (_match, arg1) => {
			return arg1
		})
		setUrlValue(value)

		const validStateUrl = validateUrl(value.trim())
		setValid((s) => (s === validStateUrl ? s : validStateUrl))
		if (validStateUrl) {
			rValue.current = value
		}
	}, [])

	const handleClear = useCallback(() => {
		editor.setProp('url', '', false)
		onClose()
	}, [editor, onClose])

	const handleComplete = useCallback(
		(value: string) => {
			value = value.trim()
			const validState = validateUrl(value)

			const shape = editor.selectedShapes[0]

			if (shape && 'url' in shape.props) {
				const current = shape.props.url
				const next = validState
					? validState === 'needs protocol'
						? 'https://' + value
						: value
					: editor.isShapeOfType(shape, TLBookmarkUtil)
					? rInitialValue.current
					: ''

				if (current !== undefined && current !== next) {
					editor.setProp('url', next, false)
				}
			}
			onClose()
		},
		[editor, onClose]
	)

	const handleCancel = useCallback(() => {
		onClose()
	}, [onClose])

	if (!selectedShape) {
		// dismiss modal
		onClose()
		return null
	}

	// Are we going from a valid state to an invalid state?
	const isRemoving = rInitialValue.current && !validState

	return (
		<>
			<Dialog.Header>
				<Dialog.Title>{msg('edit-link-dialog.title')}</Dialog.Title>
				<Dialog.CloseButton />
			</Dialog.Header>
			<Dialog.Body>
				<div className="tlui-edit-link-dialog">
					<Input
						className="tlui-edit-link-dialog__input"
						label="edit-link-dialog.url"
						autofocus
						value={urlValue}
						onValueChange={handleChange}
						onComplete={handleComplete}
						onCancel={handleCancel}
					/>
					<div>
						{validState ? msg('edit-link-dialog.detail') : msg('edit-link-dialog.invalid-url')}
					</div>
				</div>
			</Dialog.Body>
			<Dialog.Footer className="tlui-dialog__footer__actions">
				<Button onClick={handleCancel} onTouchEnd={handleCancel}>
					{msg('edit-link-dialog.cancel')}
				</Button>
				{isRemoving ? (
					<Button type={'danger'} onTouchEnd={handleClear} onClick={handleClear}>
						{msg('edit-link-dialog.clear')}
					</Button>
				) : (
					<Button
						type="primary"
						disabled={!validState}
						onTouchEnd={() => handleComplete(rValue.current)}
						onClick={() => handleComplete(rValue.current)}
					>
						{msg('edit-link-dialog.save')}
					</Button>
				)}
			</Dialog.Footer>
		</>
	)
})
