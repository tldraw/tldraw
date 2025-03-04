import { TLAudioShape, TLVideoShape, useEditor } from '@tldraw/editor'
import { Children, ReactElement, cloneElement, useCallback, useRef, useState } from 'react'
import { TldrawUiButton } from '../../ui/components/primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../../ui/components/primitives/Button/TldrawUiButtonIcon'
import { TldrawUiSlider } from '../../ui/components/primitives/TldrawUiSlider'
import { useTranslation } from '../../ui/hooks/useTranslation/useTranslation'

type MediaElement = HTMLAudioElement | HTMLVideoElement

/** @internal */
export const FULL_CONTROLS_WIDTH = 260

export function MediaControls({
	children,
	shape,
	isMutedInitially,
	widthScaled,
}: {
	children: ReactElement
	shape: TLVideoShape | TLAudioShape
	widthScaled: number
	isMutedInitially?: boolean
}) {
	const editor = useEditor()
	const [isPlaying, setIsPlaying] = useState(false)
	const [isMuted, setIsMuted] = useState(!!isMutedInitially)
	const [newSeekTime, setNewSeekTime] = useState<number | null>(null)
	const [currentTime, setCurrentTime] = useState(0)
	const msg = useTranslation()
	const rMedia = useRef<MediaElement>(null!)

	const handleOnPlay = () => setIsPlaying(true)
	const handleOnPause = () => setIsPlaying(false)
	const handleSetCurrentTime = (e: React.SyntheticEvent<MediaElement>) => {
		const media = e.currentTarget
		if (!media) return

		setCurrentTime(media.currentTime)
	}
	const handleSeek = (time: number) => {
		setNewSeekTime(time)
	}
	const handleSliderPointerUp = () => {
		if (!rMedia.current) return
		rMedia.current.currentTime = newSeekTime ?? 0
		setCurrentTime(newSeekTime ?? 0)
		setNewSeekTime(null)
	}

	const handlePlayControl = useCallback(() => {
		if (isPlaying) {
			rMedia.current?.pause()
		} else {
			rMedia.current?.play()
		}
	}, [isPlaying])
	const handleVolumeControl = () => {
		rMedia.current.muted = !isMuted
		setIsMuted(!isMuted)
	}

	const childElement = Children.only(children)
	const mediaElement = cloneElement(childElement, {
		ref: rMedia,
		onPlay: handleOnPlay,
		onPause: handleOnPause,
		onTimeUpdate: handleSetCurrentTime,
	})

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

	return (
		<>
			{mediaElement}
			{/* We stop propagation here because otherwise onPointerDown in useCanvasEvents screws things up. */}
			<div className="tl-media-controls" onPointerDown={(e) => e.stopPropagation()}>
				<TldrawUiButton
					type="icon"
					title={msg(isPlaying ? 'media.pause' : 'media.play')}
					onClick={handlePlayControl}
				>
					<TldrawUiButtonIcon icon={isPlaying ? 'pause' : 'play'} />
				</TldrawUiButton>
				{rMedia.current?.duration && widthScaled > 0.5 ? (
					<div className="tl-media-time">
						<span className="tl-media-time-current">{`${secondsToTime(newSeekTime ?? currentTime)}`}</span>
						<span>{' / '}</span>
						<span className="tl-media-time-total">{secondsToTime(rMedia.current.duration)}</span>
					</div>
				) : null}
				{widthScaled > 0.75 && (
					<TldrawUiSlider
						// XXX(mime): the slider messes up when it's resized. We set a key here to force a re-render.
						key={`slider-${shape.props.w}`}
						value={newSeekTime ?? currentTime}
						label={secondsToTime(newSeekTime ?? currentTime)}
						onValueChange={handleSeek}
						onHistoryMark={onHistoryMark}
						onPointerUp={handleSliderPointerUp}
						steps={rMedia.current?.duration || 0}
						title={msg('media.seek')}
					/>
				)}
				<TldrawUiButton
					type="icon"
					title={msg(isMuted ? 'media.unmute' : 'media.mute')}
					onMouseDown={handleVolumeControl}
				>
					<TldrawUiButtonIcon icon={isMuted ? 'speaker-off' : 'speaker-loud'} />
				</TldrawUiButton>
			</div>
		</>
	)
}

function secondsToTime(seconds: number) {
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = Math.floor(seconds % 60)
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
