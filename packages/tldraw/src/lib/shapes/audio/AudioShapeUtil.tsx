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
import { BrokenAssetIcon } from '../shared/BrokenAssetIcon'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { FULL_CONTROLS_WIDTH, MediaControls } from '../shared/MediaControls'
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
			w: FULL_CONTROLS_WIDTH,
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

		const audioAsset = asset as TLAudioAsset | undefined
		const coverArt = audioAsset?.props.coverArt
		const title = audioAsset?.props.title
		const zoom = editor.getZoomLevel()
		const widthScaled = (shape.props.w * zoom) / FULL_CONTROLS_WIDTH
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
								<MediaControls shape={shape} widthScaled={widthScaled}>
									<audio
										ref={rAudio}
										style={isEditing ? { pointerEvents: 'all' } : undefined}
										className={`tl-audio tl-audio-shape-${shape.id.split(':')[1]}`}
										draggable={false}
										onLoadedData={handleLoadedData}
										hidden={!isLoaded}
									>
										<source src={url} />
									</audio>
								</MediaControls>
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
