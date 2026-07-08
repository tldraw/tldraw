import { TLVideoShape, track, useEditor, useValue } from '@tldraw/editor'
import { TlButtonIcon } from '@tldraw/ui'
import { TlToolbarButton } from '@tldraw/ui'
import { useCallback } from 'react'
import { useActions } from '../../context/actions'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'

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
				<TlToolbarButton
					type="icon"
					title={msg('tool.replace-media')}
					onClick={handleVideoReplace}
					data-testid="tool.video-replace"
				>
					<TlButtonIcon small icon="tool-media" />
				</TlToolbarButton>
			)}
			<TlToolbarButton
				type="icon"
				title={msg('action.download-original')}
				onClick={handleVideoDownload}
				data-testid="tool.video-download"
			>
				<TlButtonIcon small icon="download" />
			</TlToolbarButton>
			{(altText || !isReadonly) && (
				<TlToolbarButton
					type="icon"
					isActive={!!altText}
					title={msg('tool.media-alt-text')}
					data-testid="tool.video-alt-text"
					onClick={() => {
						trackEvent('alt-text-start', { source })
						onEditAltTextStart()
					}}
				>
					<TlButtonIcon small icon="alt" />
				</TlToolbarButton>
			)}
		</>
	)
})
