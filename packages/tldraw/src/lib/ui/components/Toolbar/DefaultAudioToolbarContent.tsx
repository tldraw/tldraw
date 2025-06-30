import { TLAudioShape, track, useEditor, useValue } from '@tldraw/editor'
import { useCallback } from 'react'
import { useActions } from '../../context/actions'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'

/** @public */
export interface DefaultAudioToolbarContentProps {
	audioShapeId: TLAudioShape['id']
	onEditAltTextStart(): void
}

/** @public @react */
export const DefaultAudioToolbarContent = track(function DefaultAudioToolbarContent({
	audioShapeId,
	onEditAltTextStart,
}: DefaultAudioToolbarContentProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'audio-toolbar'
	const isReadonly = editor.getIsReadonly()

	const actions = useActions()

	const handleAudioReplace = useCallback(
		() => actions['audio-replace'].onSelect('audio-toolbar'),
		[actions]
	)

	const handleAudioDownload = useCallback(
		() => actions['download-original'].onSelect('audio-toolbar'),
		[actions]
	)

	const altText = useValue(
		'altText',
		() => editor.getShape<TLAudioShape>(audioShapeId)!.props.altText,
		[editor, audioShapeId]
	)

	return (
		<>
			{!isReadonly && (
				<TldrawUiButton type="icon" title={msg('tool.replace-media')} onClick={handleAudioReplace}>
					<TldrawUiButtonIcon small icon="tool-media" />
				</TldrawUiButton>
			)}
			<TldrawUiButton
				type="icon"
				title={msg('action.download-original')}
				onClick={handleAudioDownload}
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
