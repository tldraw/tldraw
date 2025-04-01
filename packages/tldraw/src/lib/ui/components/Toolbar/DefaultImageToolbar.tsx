import { Box, TLImageShape, track, useAtom, useEditor, useValue } from '@tldraw/editor'
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
	const forcePositionUpdateAtom = useAtom('force toolbar position update', 0)
	const handleEditAltTextStart = useCallback(() => setIsEditingAltText(true), [])
	const handleManipulatingStart = useCallback(() => setIsManipulating(true), [])
	const handleManipulatingEnd = useCallback(() => setIsManipulating(false), [])
	const handleToolbarSetChange = useCallback(
		() => forcePositionUpdateAtom.update((n) => n + 1),
		[forcePositionUpdateAtom]
	)
	const onEditAltTextComplete = useCallback(() => {
		setIsEditingAltText(false)
		handleToolbarSetChange()
	}, [handleToolbarSetChange])
	const getSelectionBounds = () => {
		const fullBounds = editor.getSelectionRotatedScreenBounds()
		if (!fullBounds) return undefined
		return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0)
	}

	return (
		<TldrawUiContextualToolbar
			// TODO: fix this, I can't get the render timing right at the moment
			key={forcePositionUpdateAtom.get()}
			className="tlui-image__toolbar"
			getSelectionBounds={getSelectionBounds}
			forcePositionUpdateAtom={forcePositionUpdateAtom}
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
					onToolbarSetChange={handleToolbarSetChange}
				/>
			)}
		</TldrawUiContextualToolbar>
	)
}
