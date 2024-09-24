/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	Editor,
	HTMLContainer,
	MediaHelpers,
	TLVideoShape,
	toDomPrecision,
	useEditorComponents,
	useIsEditing,
	videoShapeMigrations,
	videoShapeProps,
} from '@tldraw/editor'
import classNames from 'classnames'
import { ReactEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { BrokenAssetIcon } from '../shared/BrokenAssetIcon'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useAsset } from '../shared/useAsset'
import { usePrefersReducedMotion } from '../shared/usePrefersReducedMotion'

/** @public */
export class VideoShapeUtil extends BaseBoxShapeUtil<TLVideoShape> {
	static override type = 'video' as const
	static override props = videoShapeProps
	static override migrations = videoShapeMigrations

	override canEdit() {
		return true
	}
	override isAspectRatioLocked() {
		return true
	}

	override getDefaultProps(): TLVideoShape['props'] {
		return {
			w: 100,
			h: 100,
			assetId: null,
			time: 0,
			playing: true,
			url: '',
		}
	}

	component(shape: TLVideoShape) {
		const { editor } = this
		const showControls = editor.getShapeGeometry(shape).bounds.w * editor.getZoomLevel() >= 110
		const { asset, url } = useAsset({
			shapeId: shape.id,
			assetId: shape.props.assetId,
			width: shape.props.w,
		})
		const isEditing = useIsEditing(shape.id)
		const prefersReducedMotion = usePrefersReducedMotion()
		const { Spinner } = useEditorComponents()

		const rVideo = useRef<HTMLVideoElement>(null!)

		const [isLoaded, setIsLoaded] = useState(false)

		const [isFullscreen, setIsFullscreen] = useState(false)

		useEffect(() => {
			const fullscreenChange = () => setIsFullscreen(document.fullscreenElement === rVideo.current)
			document.addEventListener('fullscreenchange', fullscreenChange)

			return () => document.removeEventListener('fullscreenchange', fullscreenChange)
		})

		const handleLoadedData = useCallback<ReactEventHandler<HTMLVideoElement>>((e) => {
			const video = e.currentTarget
			if (!video) return

			setIsLoaded(true)
		}, [])

		// If the current time changes and we're not editing the video, update the video time
		useEffect(() => {
			const video = rVideo.current
			if (!video) return

			if (isEditing) {
				if (document.activeElement !== video) {
					video.focus()
				}
			}
		}, [isEditing, isLoaded])

		useEffect(() => {
			if (prefersReducedMotion) {
				const video = rVideo.current
				if (!video) return
				video.pause()
				video.currentTime = 0
			}
		}, [rVideo, prefersReducedMotion])

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
						<div className="tl-video-container">
							{!asset ? (
								<BrokenAssetIcon />
							) : Spinner && !asset.props.src ? (
								<Spinner />
							) : url ? (
								<>
									<video
										ref={rVideo}
										style={
											isEditing
												? { pointerEvents: 'all' }
												: !isLoaded
													? { display: 'none' }
													: undefined
										}
										className={classNames('tl-video', `tl-video-shape-${shape.id.split(':')[1]}`, {
											'tl-video-is-fullscreen': isFullscreen,
										})}
										width="100%"
										height="100%"
										draggable={false}
										playsInline
										autoPlay
										muted
										loop
										disableRemotePlayback
										disablePictureInPicture
										controls={isEditing && showControls}
										onLoadedData={handleLoadedData}
										hidden={!isLoaded}
									>
										<source src={url} />
									</video>
									{!isLoaded && Spinner && <Spinner />}
								</>
							) : null}
						</div>
					</div>
				</HTMLContainer>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={editor.getZoomLevel()} />
				)}
			</>
		)
	}

	indicator(shape: TLVideoShape) {
		return <rect width={toDomPrecision(shape.props.w)} height={toDomPrecision(shape.props.h)} />
	}

	override async toSvg(shape: TLVideoShape) {
		const image = await serializeVideo(this.editor, shape)
		if (!image) return null
		return <image href={image} width={shape.props.w} height={shape.props.h} />
	}
}

async function serializeVideo(editor: Editor, shape: TLVideoShape): Promise<string | null> {
	const assetUrl = await editor.resolveAssetUrl(shape.props.assetId, {
		shouldResolveToOriginal: true,
	})
	if (!assetUrl) return null

	const video = await MediaHelpers.loadVideo(assetUrl)
	return MediaHelpers.getVideoFrameAsDataUrl(video, 0)
}
