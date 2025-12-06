import { Box, TLVideoShape, track, useEditor, useValue } from '@tldraw/editor'
import { useCallback, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiContextualToolbar } from '../primitives/TldrawUiContextualToolbar'
import { AltTextEditor } from './AltTextEditor'
import { DefaultVideoToolbarContent } from './DefaultVideoToolbarContent'

/** @public */
export interface TLUiVideoToolbarProps {
	children?: React.ReactNode
}

/** @public @react */
export const DefaultVideoToolbar = track(function DefaultVideoToolbar({
	children,
}: TLUiVideoToolbarProps) {
	const editor = useEditor()
	const videoShapeId = useValue(
		'videoShape',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape || onlySelectedShape.type !== 'video') return null
			return onlySelectedShape.id
		},
		[editor]
	)
	const showToolbar = editor.isInAny('select.idle', 'select.pointing_shape')
	const isLocked = useValue(
		'locked',
		() => (videoShapeId ? editor.getShape<TLVideoShape>(videoShapeId)?.isLocked : false),
		[editor, videoShapeId]
	)
	if (!videoShapeId || !showToolbar || isLocked) return null

	return (
		<ContextualToolbarInner key={videoShapeId} videoShapeId={videoShapeId}>
			{children}
		</ContextualToolbarInner>
	)
})

function ContextualToolbarInner({
	children,
	videoShapeId,
}: {
	children?: React.ReactNode
	videoShapeId: TLVideoShape['id']
}) {
	const editor = useEditor()
	const msg = useTranslation()

	const [isEditingAltText, setIsEditingAltText] = useState(false)
	const handleEditAltTextStart = useCallback(() => setIsEditingAltText(true), [])
	const onEditAltTextClose = useCallback(() => setIsEditingAltText(false), [])

	const getSelectionBounds = useCallback(() => {
		const fullBounds = editor.getSelectionScreenBounds()
		if (!fullBounds) return undefined
		return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0)
	}, [editor])

	return (
		<TldrawUiContextualToolbar
			className="tlui-video__toolbar"
			getSelectionBounds={getSelectionBounds}
			label={msg('tool.video-toolbar-title')}
		>
			{children ? (
				children
			) : isEditingAltText ? (
				<AltTextEditor shapeId={videoShapeId} onClose={onEditAltTextClose} source="video-toolbar" />
			) : (
				<DefaultVideoToolbarContent
					videoShapeId={videoShapeId}
					onEditAltTextStart={handleEditAltTextStart}
				/>
			)}
		</TldrawUiContextualToolbar>
	)
}
