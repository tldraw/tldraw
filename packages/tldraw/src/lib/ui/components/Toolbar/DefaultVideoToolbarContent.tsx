import { defineMessages, TLVideoShape, track, useEditor, useValue } from '@tldraw/editor'
import { useCallback } from 'react'
import { useActions } from '../../context/actions'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'

const messages = defineMessages({
	actionDownloadOriginal: { id: 'action.download-original', defaultMessage: 'Download original' },
	toolReplaceMedia: { id: 'tool.replace-media', defaultMessage: 'Replace media…' },
	toolMediaAltText: { id: 'tool.media-alt-text', defaultMessage: 'Alternative text' },
})

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
					title={msg(messages.toolReplaceMedia)}
					onClick={handleVideoReplace}
					data-testid="tool.video-replace"
				>
					<TldrawUiButtonIcon small icon="tool-media" />
				</TldrawUiToolbarButton>
			)}
			<TldrawUiToolbarButton
				type="icon"
				title={msg(messages.actionDownloadOriginal)}
				onClick={handleVideoDownload}
				data-testid="tool.video-download"
			>
				<TldrawUiButtonIcon small icon="download" />
			</TldrawUiToolbarButton>
			{(altText || !isReadonly) && (
				<TldrawUiToolbarButton
					type="icon"
					isActive={!!altText}
					title={msg(messages.toolMediaAltText)}
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
