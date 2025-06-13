import { preventDefault, TLShape, TLShapeId, useEditor } from '@tldraw/editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiInput } from '../primitives/TldrawUiInput'

/** @public */
export interface AltTextEditorProps {
	shapeId: TLShapeId
	onClose(): void
}

/** @public @react */
export function AltTextEditor({ shapeId, onClose }: AltTextEditorProps) {
	const editor = useEditor()
	const [altText, setAltText] = useState(() => {
		const shape = editor.getShape<TLShape>(shapeId)
		if (!shape) return ''
		if (!('altText' in shape.props)) throw Error('Shape does not have altText property')
		return shape.props.altText || ''
	})
	const msg = useTranslation()
	const ref = useRef<HTMLInputElement>(null)
	const trackEvent = useUiEvents()

	const handleValueChange = (value: string) => setAltText(value)

	const handleComplete = () => {
		trackEvent('set-alt-text', { source: 'image-menu' })
		const shape = editor.getShape<TLShape & { props: { altText: string } }>(shapeId)
		if (!shape) return
		editor.updateShapes([
			{
				id: shape.id,
				type: shape.type,
				props: { altText },
			},
		])
		onClose()
	}

	const handleConfirm = () => handleComplete()
	const handleAltTextCancel = useCallback(() => onClose(), [onClose])

	useEffect(() => {
		ref.current?.focus()

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				event.stopPropagation()
				handleAltTextCancel()
			}
		}

		document.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => {
			document.removeEventListener('keydown', handleKeyDown, { capture: true })
		}
	}, [handleAltTextCancel])

	return (
		<>
			<TldrawUiInput
				ref={ref}
				className="tlui-image__toolbar-alt-text-input"
				data-testid="image-toolbar.alt-text-input"
				value={altText}
				placeholder={msg('tool.image-alt-text-desc')}
				onValueChange={handleValueChange}
				onComplete={handleComplete}
				onCancel={handleAltTextCancel}
			/>
			<TldrawUiButton
				title={msg('tool.image-alt-text-confirm')}
				type="icon"
				onPointerDown={preventDefault}
				onClick={handleConfirm}
			>
				<TldrawUiButtonIcon small icon="check" />
			</TldrawUiButton>
		</>
	)
}
