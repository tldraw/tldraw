import {
	defineMessages,
	ExtractShapeByProps,
	preventDefault,
	TLShape,
	TLShapeId,
	useEditor,
} from '@tldraw/editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiInput } from '../primitives/TldrawUiInput'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	toolMediaAltTextConfirm: { id: 'tool.media-alt-text-confirm', defaultMessage: 'Confirm' },
	toolMediaAltTextDesc: { id: 'tool.media-alt-text-desc', defaultMessage: 'Give a description…' },
})

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

	const handleComplete = useCallback(() => {
		trackEvent('set-alt-text', { source })
		const shape = editor.getShape<ExtractShapeByProps<{ altText: string }>>(shapeId)
		if (!shape) return
		editor.markHistoryStoppingPoint('set alt text')
		editor.updateShapes([
			{
				id: shape.id,
				type: shape.type,
				props: { altText },
			},
		])
		onClose()
	}, [trackEvent, source, editor, shapeId, altText, onClose])

	useEffect(() => {
		const doc = editor.getContainerDocument()
		ref.current?.select()

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				event.stopPropagation()
				onClose()
			}
		}

		doc.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => {
			doc.removeEventListener('keydown', handleKeyDown, { capture: true })
		}
	}, [editor, onClose])

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
			<TldrawUiInput
				ref={ref}
				className="tlui-media__toolbar-alt-text-input"
				data-testid="media-toolbar.alt-text-input"
				value={altText}
				placeholder={msg(messages.toolMediaAltTextDesc.id)}
				aria-label={msg(messages.toolMediaAltTextDesc.id)}
				onValueChange={setAltText}
				onComplete={handleComplete}
				onCancel={onClose}
				disabled={isReadonly}
			/>
			{!isReadonly && (
				<TldrawUiButton
					title={msg(messages.toolMediaAltTextConfirm.id)}
					data-testid="tool.media-alt-text-confirm"
					type="icon"
					onPointerDown={preventDefault}
					onClick={handleComplete}
				>
					<TldrawUiButtonIcon small icon="check" />
				</TldrawUiButton>
			)}
		</>
	)
}
