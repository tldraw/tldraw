import { Box, TLAudioShape, track, useEditor, useValue } from '@tldraw/editor'
import { useCallback, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiContextualToolbar } from '../primitives/TldrawUiContextualToolbar'
import { AltTextEditor } from './AltTextEditor'
import { DefaultAudioToolbarContent } from './DefaultAudioToolbarContent'

/** @public */
export interface TLUiAudioToolbarProps {
	children?: React.ReactNode
}

/** @public @react */
export const DefaultAudioToolbar = track(function DefaultAudioToolbar({
	children,
}: TLUiAudioToolbarProps) {
	const editor = useEditor()
	const audioShapeId = useValue(
		'audioShape',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape || onlySelectedShape.type !== 'audio') return null
			return onlySelectedShape.id
		},
		[editor]
	)
	const showToolbar = editor.isInAny('select.idle', 'select.pointing_shape')
	const isLocked = useValue(
		'locked',
		() => (audioShapeId ? editor.getShape<TLAudioShape>(audioShapeId)?.isLocked : false),
		[editor, audioShapeId]
	)
	if (!audioShapeId || !showToolbar || isLocked) return null

	return (
		<ContextualToolbarInner key={audioShapeId} audioShapeId={audioShapeId}>
			{children}
		</ContextualToolbarInner>
	)
})

function ContextualToolbarInner({
	children,
	audioShapeId,
}: {
	children?: React.ReactNode
	audioShapeId: TLAudioShape['id']
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
			className="tlui-audio__toolbar"
			getSelectionBounds={getSelectionBounds}
			label={msg('tool.audio-toolbar-title')}
		>
			{children ? (
				children
			) : isEditingAltText ? (
				<AltTextEditor shapeId={audioShapeId} onClose={onEditAltTextClose} source="audio-toolbar" />
			) : (
				<DefaultAudioToolbarContent
					audioShapeId={audioShapeId}
					onEditAltTextStart={handleEditAltTextStart}
				/>
			)}
		</TldrawUiContextualToolbar>
	)
}
