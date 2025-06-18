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
	const imageShapeId = useValue(
		'imageShape',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape || onlySelectedShape.type !== 'image') return null
			return onlySelectedShape.id
		},
		[editor]
	)
	const showToolbar = editor.isInAny('select.idle', 'select.pointing_shape', 'select.crop')
	const isLocked = useValue(
		'locked',
		() => (imageShapeId ? editor.getShape<TLImageShape>(imageShapeId)?.isLocked : false),
		[editor, imageShapeId]
	)
	if (!imageShapeId || !showToolbar || isLocked) return null

	return (
		<ContextualToolbarInner key={imageShapeId} imageShapeId={imageShapeId}>
			{children}
		</ContextualToolbarInner>
	)
})

function ContextualToolbarInner({
	children,
	imageShapeId,
}: {
	children?: React.ReactNode
	imageShapeId: TLImageShape['id']
}) {
	const editor = useEditor()
	const msg = useTranslation()

	const isInCropTool = useValue('editor path', () => editor.isIn('select.crop.'), [editor])
	const isCropping = useValue('editor path', () => editor.isIn('select.crop.cropping'), [editor])
	const handleManipulatingEnd = useCallback(() => editor.setCurrentTool('select.idle'), [editor])

	const [isEditingAltText, setIsEditingAltText] = useState(false)
	const handleEditAltTextStart = useCallback(() => setIsEditingAltText(true), [])
	const handleManipulatingStart = useCallback(
		() => editor.setCurrentTool('select.crop.idle'),
		[editor]
	)
	const onEditAltTextClose = useCallback(() => setIsEditingAltText(false), [])

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
				<AltTextEditor shapeId={imageShapeId} onClose={onEditAltTextClose} source="image-toolbar" />
			) : (
				<DefaultImageToolbarContent
					imageShapeId={imageShapeId}
					isManipulating={isInCropTool}
					onEditAltTextStart={handleEditAltTextStart}
					onManipulatingStart={handleManipulatingStart}
					onManipulatingEnd={handleManipulatingEnd}
				/>
			)}
		</TldrawUiContextualToolbar>
	)
}
