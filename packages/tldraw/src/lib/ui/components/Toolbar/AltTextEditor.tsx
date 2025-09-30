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
	source: 'image-toolbar' | 'video-toolbar'
}

/** @public @react */
export function AltTextEditor({ shapeId, onClose, source }: AltTextEditorProps) {
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
	const isReadonly = editor.getIsReadonly()

	const handleValueChange = (value: string) => setAltText(value)

	const handleComplete = () => {
		trackEvent('set-alt-text', { source })
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
		ref.current?.select()

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
				className="tlui-media__toolbar-alt-text-input"
				data-testid="media-toolbar.alt-text-input"
				value={altText}
				placeholder={msg('tool.media-alt-text-desc')}
				aria-label={msg('tool.media-alt-text-desc')}
				onValueChange={handleValueChange}
				onComplete={handleComplete}
				onCancel={handleAltTextCancel}
				disabled={isReadonly}
			/>
			{!isReadonly && (
				<TldrawUiButton
					title={msg('tool.media-alt-text-confirm')}
					data-testid="tool.media-alt-text-confirm"
					type="icon"
					onPointerDown={preventDefault}
					onClick={handleConfirm}
				>
					<TldrawUiButtonIcon small icon="check" />
				</TldrawUiButton>
			)}
		</>
	)
}
