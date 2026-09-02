import { TLVideoShape, track, useEditor, useValue } from '@tldraw/editor'
import { useCallback } from 'react'
import { useActions } from '../../context/actions'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'

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
				<TldrawUiToolbarButton
					type="icon"
					title={msg('tool.replace-media')}
					onClick={handleVideoReplace}
					data-testid="tool.video-replace"
				>
					<TldrawUiButtonIcon small icon="tool-media" />
				</TldrawUiToolbarButton>
			)}
			<TldrawUiToolbarButton
				type="icon"
				title={msg('action.download-original')}
				onClick={handleVideoDownload}
				data-testid="tool.video-download"
			>
				<TldrawUiButtonIcon small icon="download" />
			</TldrawUiToolbarButton>
			{(altText || !isReadonly) && (
				<TldrawUiToolbarButton
					type="icon"
					isActive={!!altText}
					title={msg('tool.media-alt-text')}
					data-testid="tool.video-alt-text"
					onClick={() => {
						trackEvent('alt-text-start', { source })
						onEditAltTextStart()
					}}
				>
					<TldrawUiButtonIcon small icon="alt" />
				</TldrawUiToolbarButton>
			)}
		</>
	)
})
