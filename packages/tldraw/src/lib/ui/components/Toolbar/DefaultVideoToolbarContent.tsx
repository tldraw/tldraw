import { TLVideoShape, track, useEditor, useValue } from '@tldraw/editor'
import { useCallback } from 'react'
import { useActions } from '../../context/actions'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'

/** @public */
export interface DefaultVideoToolbarContentProps {
	videoShapeId: TLVideoShape['id']
	onEditAltTextStart(): void
}

/** @public @react */
export const DefaultVideoToolbarContent = track(function DefaultVideoToolbarContent({
	videoShapeId,
	onEditAltTextStart,
}: DefaultVideoToolbarContentProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'video-toolbar'
	const isReadonly = editor.getIsReadonly()

	const actions = useActions()

	const handleVideoReplace = useCallback(
		() => actions['video-replace'].onSelect('video-toolbar'),
		[actions]
	)

	const handleVideoDownload = useCallback(
		() => actions['download-original'].onSelect('video-toolbar'),
		[actions]
	)

	const altText = useValue(
		'altText',
		() => editor.getShape<TLVideoShape>(videoShapeId)!.props.altText,
		[editor, videoShapeId]
	)

	return (
		<>
			{!isReadonly && (
				<TldrawUiButton type="icon" title={msg('tool.replace-media')} onClick={handleVideoReplace}>
					<TldrawUiButtonIcon small icon="tool-media" />
				</TldrawUiButton>
			)}
			<TldrawUiButton
				type="icon"
				title={msg('action.download-original')}
				onClick={handleVideoDownload}
			>
				<TldrawUiButtonIcon small icon="download" />
			</TldrawUiButton>
			{(altText || !isReadonly) && (
				<TldrawUiButton
					type="normal"
					isActive={!!altText}
					title={msg('tool.media-alt-text')}
					onClick={() => {
						trackEvent('alt-text-start', { source })
						onEditAltTextStart()
					}}
				>
					<TldrawUiButtonIcon small icon="alt" />
				</TldrawUiButton>
			)}
		</>
	)
})
