import { preventDefault, TLImageShape, useEditor } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiInput } from '../primitives/TldrawUiInput'

/** @public */
export interface AltTextEditorProps {
	imageShape: TLImageShape
	value: string
	onComplete(): void
}

/** @public @react */
export function AltTextEditor({ imageShape, value: initialValue, onComplete }: AltTextEditorProps) {
	const editor = useEditor()
	const [altText, setAltText] = useState(initialValue)
	const msg = useTranslation()
	const ref = useRef<HTMLInputElement>(null)
	const trackEvent = useUiEvents()

	const handleValueChange = (value: string) => setAltText(value)

	const handleComplete = () => {
		trackEvent('set-alt-text', { source: 'image-menu' })
		editor.updateShapes([
			{
				id: imageShape.id,
				type: imageShape.type,
				props: { altText },
			},
		])
		onComplete()
	}

	const handleConfirm = () => handleComplete()
	const handleAltTextCancel = () => onComplete()

	useEffect(() => {
		if (!altText) {
			ref.current?.focus()
		}
	}, [altText])

	return (
		<>
			<TldrawUiInput
				ref={ref}
				className="tlui-image__toolbar-alt-text-input"
				data-testid="image-toolbar.alt-text-input"
				value={altText}
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
