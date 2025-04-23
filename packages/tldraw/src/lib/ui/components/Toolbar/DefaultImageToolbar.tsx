import { Box, TLImageShape, track, useEditor, useQuickReactor, useValue } from '@tldraw/editor'
import { useCallback, useEffect, useState } from 'react'
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
	const editorPath = useValue('editor path', () => editor.getPath(), [editor])
	const isInCropTool = editorPath.startsWith('select.crop.')
	const isCropping = editorPath === 'select.crop.cropping'
	const [isEditingAltText, setIsEditingAltText] = useState(false)
	const [isManipulating, setIsManipulating] = useState(false)
	const [cachedManipulatingScreenBounds, setCachedManipulatingScreenBounds] = useState<
		Box | undefined
	>(undefined)
	const [forceRerender, setForceReRender] = useState(0)
	const handleEditAltTextStart = useCallback(() => {
		setIsEditingAltText(true)
		setForceReRender((n) => n + 1)
	}, [])
	const handleManipulatingStart = useCallback(() => {
		setIsManipulating(true)
		editor.setCurrentTool('select.crop.idle')
		setForceReRender((n) => n + 1)
	}, [editor])
	const handleManipulatingEnd = useCallback(() => {
		setIsManipulating(false)
		editor.setCurrentTool('select.idle')
		setForceReRender((n) => n + 1)
	}, [editor])
	const onEditAltTextComplete = useCallback(() => {
		setIsEditingAltText(false)
		setForceReRender((n) => n + 1)
	}, [])

	const getSelectionBounds = useCallback(() => {
		const fullBounds = editor.getSelectionScreenBounds()
		if (!fullBounds) return undefined
		const bounds = new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0)

		// We cache the bounds because when manipulating it's annoying that the
		// toolbar moves around, esp. when rotating.
		if (isManipulating) {
			if (!cachedManipulatingScreenBounds) {
				setCachedManipulatingScreenBounds(bounds)
			} else {
				return cachedManipulatingScreenBounds
			}
		} else {
			setCachedManipulatingScreenBounds(undefined)
		}
		return bounds
	}, [editor, isManipulating, cachedManipulatingScreenBounds])

	useQuickReactor(
		'camera position',
		function updateToolbarPositionAndDisplay() {
			// capture / force this to update when the camera moves
			editor.getCamera()
			setCachedManipulatingScreenBounds(undefined)
		},
		[editor]
	)

	useEffect(() => {
		if (isInCropTool && !isManipulating) {
			handleManipulatingStart()
		}
		if (!isInCropTool && isManipulating) {
			handleManipulatingEnd()
		}
	}, [isInCropTool, editor, isManipulating, handleManipulatingStart, handleManipulatingEnd])

	if (isCropping) return null

	return (
		<TldrawUiContextualToolbar
			// TODO: this is a little hack to force the toolbar to re-render when
			// we go into crop mode.
			key={forceRerender}
			className="tlui-image__toolbar"
			getSelectionBounds={getSelectionBounds}
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
					isManipulating={isManipulating}
					onEditAltTextStart={handleEditAltTextStart}
					onManipulatingStart={handleManipulatingStart}
					onManipulatingEnd={handleManipulatingEnd}
				/>
			)}
		</TldrawUiContextualToolbar>
	)
}
