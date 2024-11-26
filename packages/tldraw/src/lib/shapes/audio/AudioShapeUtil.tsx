/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	Editor,
	HTMLContainer,
	TLAudioAsset,
	TLAudioShape,
	audioShapeMigrations,
	audioShapeProps,
	toDomPrecision,
	useIsEditing,
} from '@tldraw/editor'
import { ReactEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { TldrawUiButton } from '../../ui/components/primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../../ui/components/primitives/Button/TldrawUiButtonIcon'
import { TldrawUiSlider } from '../../ui/components/primitives/TldrawUiSlider'
import { useTranslation } from '../../ui/hooks/useTranslation/useTranslation'
import { BrokenAssetIcon } from '../shared/BrokenAssetIcon'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useMediaAsset } from '../shared/useMediaAsset'

/** @public */
export class AudioShapeUtil extends BaseBoxShapeUtil<TLAudioShape> {
	static override type = 'audio' as const
	static override props = audioShapeProps
	static override migrations = audioShapeMigrations

	override canEdit() {
		return true
	}

	override isAspectRatioLocked() {
		return true
	}

	override getDefaultProps(): TLAudioShape['props'] {
		return {
			w: AUDIO_WIDTH,
			h: AUDIO_HEIGHT,
			assetId: null,
			time: 0,
			playing: true,
			url: '',
		}
	}

	component(shape: TLAudioShape) {
		const { editor } = this
		const { asset, url } = useMediaAsset({
			shapeId: shape.id,
			assetId: shape.props.assetId,
		})
		const isEditing = useIsEditing(shape.id)
		const [isPlaying, setIsPlaying] = useState(false)
		const [isMuted, setIsMuted] = useState(false)
		const [newSeekTime, setNewSeekTime] = useState<number | null>(null)
		const [currentTime, setCurrentTime] = useState(0)
		const msg = useTranslation()

		const rAudio = useRef<HTMLAudioElement>(null!)

		const [isLoaded, setIsLoaded] = useState(false)

		const handleLoadedData = useCallback<ReactEventHandler<HTMLAudioElement>>((e) => {
			const audio = e.currentTarget
			if (!audio) return

			setIsLoaded(true)
		}, [])

		// If the current time changes and we're not editing the audio, update the audio time
		useEffect(() => {
			const audio = rAudio.current
			if (!audio) return

			if (isEditing) {
				if (document.activeElement !== audio) {
					audio.focus()
				}
			}
		}, [isEditing, isLoaded])

		const handleOnPlay = () => setIsPlaying(true)
		const handleOnPause = () => setIsPlaying(false)
		const handleSetCurrentTime = (e: React.SyntheticEvent<HTMLAudioElement>) => {
			const audio = e.currentTarget
			if (!audio) return

			setCurrentTime(audio.currentTime)
		}
		const handleSeek = (time: number) => {
			setNewSeekTime(time)
		}
		const handleSliderPointerUp = () => {
			if (!rAudio.current) return
			rAudio.current.currentTime = newSeekTime ?? 0
			setNewSeekTime(null)
		}

		const handlePlayControl = useCallback(() => {
			if (isPlaying) {
				rAudio.current?.pause()
			} else {
				rAudio.current?.play()
			}
		}, [isPlaying])
		const handleVolumeControl = () => {
			rAudio.current.muted = !isMuted
			setIsMuted(!isMuted)
		}

		const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

		const audioAsset = asset as TLAudioAsset | undefined
		const coverArt = audioAsset?.props.coverArt
		const title = audioAsset?.props.title
		const zoom = editor.getZoomLevel()
		const widthScaled = (shape.props.w * zoom) / AUDIO_WIDTH
		const heightScaled = (shape.props.h * zoom) / AUDIO_HEIGHT

		return (
			<>
				<HTMLContainer
					id={shape.id}
					style={{
						color: 'var(--color-text-3)',
						backgroundColor: asset ? 'transparent' : 'var(--color-low)',
						border: asset ? 'none' : '1px solid var(--color-low-border)',
					}}
				>
					<div className="tl-counter-scaled">
						<div className="tl-audio-container" data-hastitle={!!title}>
							{coverArt && heightScaled > 0.2 && (
								<div
									className="tl-audio-cover-art"
									style={{ backgroundImage: `url(${coverArt})` }}
									title="cover art"
								/>
							)}
							{!asset?.props.src ? (
								<BrokenAssetIcon />
							) : url ? (
								<>
									<audio
										ref={rAudio}
										style={isEditing ? { pointerEvents: 'all' } : undefined}
										className={`tl-audio tl-audio-shape-${shape.id.split(':')[1]}`}
										draggable={false}
										onPlay={handleOnPlay}
										onPause={handleOnPause}
										onTimeUpdate={handleSetCurrentTime}
										onLoadedData={handleLoadedData}
										hidden={!isLoaded}
									>
										<source src={url} />
									</audio>
									{/* We stop propagation here because otherwise onPointerDown in useCanvasEvents screws things up. */}
									<div className="tl-audio-controls" onPointerDown={(e) => e.stopPropagation()}>
										<TldrawUiButton
											type="icon"
											title={msg(isPlaying ? 'audio.pause' : 'audio.play')}
											onClick={handlePlayControl}
										>
											<TldrawUiButtonIcon icon={isPlaying ? 'pause' : 'play'} />
										</TldrawUiButton>
										{rAudio.current?.duration && widthScaled > 0.5 ? (
											<div className="tl-audio-time">
												<span className="tl-audio-time-current">{`${secondsToTime(newSeekTime ?? currentTime)}`}</span>
												<span>{' / '}</span>
												<span className="tl-audio-time-total">
													{secondsToTime(rAudio.current.duration)}
												</span>
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
												steps={rAudio.current?.duration || 0}
												title={msg('audio.seek')}
											/>
										)}
										<TldrawUiButton
											type="icon"
											title={msg(isMuted ? 'audio.unmute' : 'audio.mute')}
											onMouseDown={handleVolumeControl}
										>
											<TldrawUiButtonIcon icon={isMuted ? 'speaker-off' : 'speaker-loud'} />
										</TldrawUiButton>
									</div>
								</>
							) : null}
							{title && heightScaled > 0.2 && (
								<div className="tl-audio-title" title={title}>
									{title}
								</div>
							)}
						</div>
					</div>
				</HTMLContainer>
				{'url' in shape.props && shape.props.url && <HyperlinkButton url={shape.props.url} />}
			</>
		)
	}

	indicator(shape: TLAudioShape) {
		return <rect width={toDomPrecision(shape.props.w)} height={toDomPrecision(shape.props.h)} />
	}

	override toSvg(shape: TLAudioShape) {
		const asset = shape.props.assetId
			? (this.editor.getAsset(shape.props.assetId) as TLAudioAsset)
			: undefined

		if (asset?.props.coverArt) {
			return <image href={asset?.props.coverArt} width={shape.props.w} height={shape.props.h} />
		} else {
			return <text>🎵</text>
		}
	}

	override onBeforeCreate(next: TLAudioShape) {
		return getAudioSize(this.editor, next)
	}

	override onBeforeUpdate(prev: TLAudioShape, shape: TLAudioShape) {
		if (prev.props.assetId !== shape.props.assetId) {
			return getAudioSize(this.editor, shape)
		}
	}
}

/** @internal */
export const AUDIO_WIDTH = 260
/** @internal */
export const AUDIO_HEIGHT = 252
const AUDIO_WITHOUT_COVER_ART_HEIGHT = 60
const AUDIO_WITHOUT_ANYTHING_HEIGHT = 32

function getAudioSize(editor: Editor, shape: TLAudioShape) {
	const asset = (shape.props.assetId ? editor.getAsset(shape.props.assetId) : null) as TLAudioAsset

	let h = AUDIO_HEIGHT

	if (asset) {
		if (!asset.props.coverArt) {
			if (!asset.props.title) {
				h = AUDIO_WITHOUT_ANYTHING_HEIGHT
			} else {
				h = AUDIO_WITHOUT_COVER_ART_HEIGHT
			}
		}
	}

	return {
		...shape,
		props: {
			...shape.props,
			h,
		},
	}
}

function secondsToTime(seconds: number) {
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = Math.floor(seconds % 60)
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
