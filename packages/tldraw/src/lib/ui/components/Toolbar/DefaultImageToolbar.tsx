import { Box, TLImageShape, track, useEditor, useValue } from '@tldraw/editor'
import { useCallback, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiContextualToolbar } from '../primitives/TldrawUiContextualToolbar'
import { AltTextEditor } from './AltTextEditor'
import { DefaultImageToolbarContent } from './DefaultImageToolbarContent'

/** @public */
export interface TLUiImageToolbarProps {
	children?: React.ReactNode
}

/** @public @react */
export const DefaultImageToolbar = track(function DefaultImageToolbar({
	children,
}: TLUiImageToolbarProps) {
	const editor = useEditor()
	const imageShape = useValue(
		'imageShape',
		() => (editor.getOnlySelectedShape()?.type === 'image' ? editor.getOnlySelectedShape() : null),
		[editor]
	)
	const showToolbar = editor.isInAny('select.idle', 'select.pointing_shape', 'select.crop')
	if (!imageShape || !showToolbar) return null

	return (
		<ContextualToolbarInner imageShape={imageShape as TLImageShape}>
			{children}
		</ContextualToolbarInner>
	)
})

function ContextualToolbarInner({
	children,
	imageShape,
}: {
	children?: React.ReactNode
	imageShape: TLImageShape
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const editorPath = useValue('editor path', () => editor.getPath(), [editor])
	const isInCropTool = editorPath.startsWith('select.crop.')
	const isCropping = editorPath === 'select.crop.cropping'
	const [isEditingAltText, setIsEditingAltText] = useState(false)
	const handleEditAltTextStart = useCallback(() => setIsEditingAltText(true), [])
	const handleManipulatingStart = useCallback(
		() => editor.setCurrentTool('select.crop.idle'),
		[editor]
	)
	const handleManipulatingEnd = useCallback(() => editor.setCurrentTool('select.idle'), [editor])
	const onEditAltTextComplete = useCallback(() => setIsEditingAltText(false), [])

	const getSelectionBounds = useCallback(() => {
		const fullBounds = editor.getSelectionScreenBounds()
		if (!fullBounds) return undefined
		return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0)
	}, [editor])

	if (isCropping) return null

	return (
		<TldrawUiContextualToolbar
			className="tlui-image__toolbar"
			getSelectionBounds={getSelectionBounds}
			label={msg('tool.image-toolbar-title')}
		>
			{children ? (
				children
			) : isEditingAltText ? (
				<AltTextEditor
					imageShape={imageShape}
					value={imageShape.props.altText}
					onComplete={onEditAltTextComplete}
				/>
			) : (
				<DefaultImageToolbarContent
					imageShape={imageShape}
					isManipulating={isInCropTool}
					onEditAltTextStart={handleEditAltTextStart}
					onManipulatingStart={handleManipulatingStart}
					onManipulatingEnd={handleManipulatingEnd}
				/>
			)}
		</TldrawUiContextualToolbar>
	)
}
