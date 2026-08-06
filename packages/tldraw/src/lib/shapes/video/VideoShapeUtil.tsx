import {
	BaseBoxShapeUtil,
	HTMLContainer,
	MediaHelpers,
	SvgExportContext,
	TLAsset,
	TLShapePartial,
	TLVideoAsset,
	TLVideoShape,
	VecModel,
	WeakCache,
	createShapeId,
	useEditor,
	useEditorComponents,
	useIsEditing,
	videoShapeMigrations,
	videoShapeProps,
} from '@tldraw/editor'
import classNames from 'classnames'
import { ReactEventHandler, memo, useCallback, useEffect, useRef, useState } from 'react'
import { BrokenAssetIcon } from '../shared/BrokenAssetIcon'
import type { ShapeOptionsWithDisplayValues } from '../shared/getDisplayValues'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useImageOrVideoAsset } from '../shared/useImageOrVideoAsset'
import { usePrefersReducedMotion } from '../shared/usePrefersReducedMotion'

const videoSvgExportCache = new WeakCache<TLAsset, Promise<string | null>>()

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VideoShapeUtilDisplayValues {}

/** @public */
export interface VideoShapeOptions extends ShapeOptionsWithDisplayValues<
	TLVideoShape,
	VideoShapeUtilDisplayValues
> {
	/**
	 * Should videos play automatically?
	 */
	autoplay: boolean
}

/** @public */
export class VideoShapeUtil extends BaseBoxShapeUtil<TLVideoShape> {
	static override type = 'video' as const
	static override props = videoShapeProps
	static override migrations = videoShapeMigrations
	static override handledAssetTypes = ['video'] as const

	override options: VideoShapeOptions = {
		autoplay: true,
		getDefaultDisplayValues(): VideoShapeUtilDisplayValues {
			return {}
		},
		getCustomDisplayValues(): Partial<VideoShapeUtilDisplayValues> {
			return {}
		},
	}

	override canEdit(shape: TLVideoShape) {
		return true
	}
	override isAspectRatioLocked(shape: TLVideoShape) {
		return true
	}

	override getDefaultProps(): TLVideoShape['props'] {
		return {
			w: 100,
			h: 100,
			assetId: null,
			autoplay: this.options.autoplay,
			url: '',
			altText: '',
			// Not used, but once upon a time were used to sync video state between users
			time: 0,
			playing: true,
		}
	}

	override createShapeForAsset(asset: TLAsset, position: VecModel): TLShapePartial | null {
		const videoAsset = asset as TLVideoAsset
		return {
			id: createShapeId(),
			type: 'video',
			x: position.x,
			y: position.y,
			opacity: 1,
			props: {
				assetId: videoAsset.id,
				w: videoAsset.props.w,
				h: videoAsset.props.h,
			},
		}
	}

	override getAriaDescriptor(shape: TLVideoShape) {
		return shape.props.altText
	}

	component(shape: TLVideoShape) {
		return <VideoShape shape={shape} />
	}

	override getIndicatorPath(shape: TLVideoShape): Path2D {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	override async toSvg(shape: TLVideoShape, ctx: SvgExportContext) {
		const props = shape.props
		if (!props.assetId) return null

		const asset = this.editor.getAsset<TLAsset>(props.assetId)
		if (!asset) return null

		const src = await videoSvgExportCache.get(asset, async () => {
			const assetUrl = await ctx.resolveAssetUrl(asset.id, props.w)
			if (!assetUrl) return null
			const video = await MediaHelpers.loadVideo(assetUrl, this.editor.getContainerDocument())
			return await MediaHelpers.getVideoFrameAsDataUrl(video, 0)
		})

		if (!src) return null

		return <image href={src} width={props.w} height={props.h} aria-label={shape.props.altText} />
	}
}

const VideoShape = memo(function VideoShape({ shape }: { shape: TLVideoShape }) {
	const editor = useEditor()
	const showControls =
		editor.getShapeGeometry(shape).bounds.w * editor.getEfficientZoomLevel() >= 110
	const isEditing = useIsEditing(shape.id)
	const prefersReducedMotion = usePrefersReducedMotion()
	const { Spinner } = useEditorComponents()

	const { asset, url } = useImageOrVideoAsset({
		shapeId: shape.id,
		assetId: shape.props.assetId,
		width: shape.props.w,
	})

	const rVideo = useRef<HTMLVideoElement>(null!)

	const [isLoaded, setIsLoaded] = useState(false)

	const handleLoadedData = useCallback<ReactEventHandler<HTMLVideoElement>>((e) => {
		const video = e.currentTarget
		if (!video) return
		setIsLoaded(true)
	}, [])

	const [isFullscreen, setIsFullscreen] = useState(false)

	useEffect(() => {
		const doc = rVideo.current?.ownerDocument ?? editor.getContainerDocument()
		const fullscreenChange = () => setIsFullscreen(doc.fullscreenElement === rVideo.current)
		doc.addEventListener('fullscreenchange', fullscreenChange)

		return () => doc.removeEventListener('fullscreenchange', fullscreenChange)
	})

	// Focus the video when editing
	useEffect(() => {
		const video = rVideo.current
		if (!video) return

		if (isEditing) {
			if (video.ownerDocument.activeElement !== video) {
				video.focus()
			}
		}
	}, [isEditing, isLoaded])

	return (
		<>
			<HTMLContainer
				id={shape.id}
				style={{
					color: 'var(--tl-color-text-3)',
					backgroundColor: asset ? 'transparent' : 'var(--tl-color-low)',
					border: asset ? 'none' : '1px solid var(--tl-color-low-border)',
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
									key={url}
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
									autoPlay={shape.props.autoplay && !prefersReducedMotion}
									muted
									loop
									disableRemotePlayback
									disablePictureInPicture
									controls={isEditing && showControls}
									onLoadedData={handleLoadedData}
									hidden={!isLoaded}
									aria-label={shape.props.altText}
								>
									<source src={url} />
								</video>
								{!isLoaded && Spinner && <Spinner />}
							</>
						) : null}
					</div>
				</div>
			</HTMLContainer>
			{'url' in shape.props && shape.props.url && <HyperlinkButton url={shape.props.url} />}
		</>
	)
})
