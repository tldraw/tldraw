import { Box, TLImageShape, track, useEditor, useValue } from '@tldraw/editor'
import { useCallback, useState } from 'react'
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
	const [isEditingAltText, setIsEditingAltText] = useState(false)
	const [isManipulating, setIsManipulating] = useState(false)
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
	const getSelectionBounds = () => {
		const fullBounds = editor.getSelectionScreenBounds()
		if (!fullBounds) return undefined
		return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0)
	}

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
