import { ExtractShapeByProps, preventDefault, TLShape, TLShapeId, useEditor } from '@tldraw/editor'
import { TlButton } from '@tldraw/ui'
import { TlButtonIcon } from '@tldraw/ui'
import { TlInput } from '@tldraw/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'

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

	const handleComplete = useCallback(() => {
		trackEvent('set-alt-text', { source })
		const shape = editor.getShape<ExtractShapeByProps<{ altText: string }>>(shapeId)
		if (!shape) return
		editor.updateShapes([
			{
				id: shape.id,
				type: shape.type,
				props: { altText },
			},
		])
		onClose()
	}, [trackEvent, source, editor, shapeId, altText, onClose])

	const handleConfirm = () => handleComplete()
	const handleAltTextCancel = useCallback(() => onClose(), [onClose])

	useEffect(() => {
		const doc = editor.getContainerDocument()
		ref.current?.select()

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				event.stopPropagation()
				handleAltTextCancel()
			}
		}

		doc.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => {
			doc.removeEventListener('keydown', handleKeyDown, { capture: true })
		}
	}, [editor, handleAltTextCancel])

	useEffect(() => {
		const doc = editor.getContainerDocument()
		const handlePointerDown = (e: PointerEvent) => {
			const toolbar = doc.querySelector('.tlui-media__toolbar')
			if (toolbar?.contains(e.target as Node)) return
			// If the pointer down is not in the toolbar, complete the alt text
			handleComplete()
		}
		doc.addEventListener('pointerdown', handlePointerDown, { capture: true })

		return () => {
			doc.removeEventListener('pointerdown', handlePointerDown, { capture: true })
		}
	}, [editor, handleComplete])

	return (
		<>
			<TlInput
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
				<TlButton
					title={msg('tool.media-alt-text-confirm')}
					data-testid="tool.media-alt-text-confirm"
					type="icon"
					onPointerDown={preventDefault}
					onClick={handleConfirm}
				>
					<TlButtonIcon small icon="check" />
				</TlButton>
			)}
		</>
	)
}
