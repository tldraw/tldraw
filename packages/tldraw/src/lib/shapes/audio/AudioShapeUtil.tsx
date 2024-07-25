/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	TLAudioAsset,
	TLAudioShape,
	audioShapeMigrations,
	audioShapeProps,
	toDomPrecision,
	useIsEditing,
} from '@tldraw/editor'
import { ReactEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { BrokenAssetIcon } from '../shared/BrokenAssetIcon'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useAsset } from '../shared/useAsset'

/** @public */
export class AudioShapeUtil extends BaseBoxShapeUtil<TLAudioShape> {
	static override type = 'audio' as const
	static override props = audioShapeProps
	static override migrations = audioShapeMigrations

	override canEdit = () => true
	override isAspectRatioLocked = () => true

	override getDefaultProps(): TLAudioShape['props'] {
		return {
			w: 100,
			h: 100,
			assetId: null,
			time: 0,
			playing: true,
			url: '',
		}
	}

	component(shape: TLAudioShape) {
		const { editor } = this
		const { asset, url } = useAsset(shape.id, shape.props.assetId, shape.props.w)
		const { time, playing } = shape.props
		const isEditing = useIsEditing(shape.id)

		const rAudio = useRef<HTMLAudioElement>(null!)

		const handlePlay = useCallback<ReactEventHandler<HTMLAudioElement>>(
			(e) => {
				const audio = e.currentTarget
				if (!audio) return

				editor.updateShapes([
					{
						type: 'audio',
						id: shape.id,
						props: {
							playing: true,
							time: audio.currentTime,
						},
					},
				])
			},
			[shape.id, editor]
		)

		const handlePause = useCallback<ReactEventHandler<HTMLAudioElement>>(
			(e) => {
				const audio = e.currentTarget
				if (!audio) return

				editor.updateShapes([
					{
						type: 'audio',
						id: shape.id,
						props: {
							playing: false,
							time: audio.currentTime,
						},
					},
				])
			},
			[shape.id, editor]
		)

		const handleSetCurrentTime = useCallback<ReactEventHandler<HTMLAudioElement>>(
			(e) => {
				const audio = e.currentTarget
				if (!audio) return

				if (isEditing) {
					editor.updateShapes([
						{
							type: 'audio',
							id: shape.id,
							props: {
								time: audio.currentTime,
							},
						},
					])
				}
			},
			[isEditing, shape.id, editor]
		)

		const [isLoaded, setIsLoaded] = useState(false)

		const handleLoadedData = useCallback<ReactEventHandler<HTMLAudioElement>>(
			(e) => {
				const audio = e.currentTarget
				if (!audio) return
				if (time !== audio.currentTime) {
					audio.currentTime = time
				}

				if (!playing) {
					audio.pause()
				}

				setIsLoaded(true)
			},
			[playing, time]
		)

		// If the current time changes and we're not editing the audio, update the audio time
		useEffect(() => {
			const audio = rAudio.current
			if (!audio) return

			if (isLoaded && !isEditing && time !== audio.currentTime) {
				audio.currentTime = time
			}

			if (isEditing) {
				if (document.activeElement !== audio) {
					audio.focus()
				}
			}
		}, [isEditing, isLoaded, time])

		const audioAsset = asset as TLAudioAsset | undefined
		const coverArt = audioAsset?.props.coverArt
		const title = audioAsset?.props.title

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
						<div className="tl-audio-container">
							{coverArt && (
								<div
									className="tl-audio-cover-art"
									style={{ backgroundImage: `url(${coverArt})` }}
									title="cover art"
								/>
							)}
							{!asset?.props.src ? (
								<BrokenAssetIcon />
							) : url ? (
								<audio
									ref={rAudio}
									style={isEditing ? { pointerEvents: 'all' } : undefined}
									className={`tl-audio tl-audio-shape-${shape.id.split(':')[1]}`}
									draggable={false}
									loop
									controls
									onPlay={handlePlay}
									onPause={handlePause}
									onTimeUpdate={handleSetCurrentTime}
									onLoadedData={handleLoadedData}
									hidden={!isLoaded}
								>
									<source src={url} />
								</audio>
							) : null}
							{title && (
								<div className="tl-audio-title" title={title}>
									{title}
								</div>
							)}
						</div>
					</div>
				</HTMLContainer>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={editor.getZoomLevel()} />
				)}
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
}
