import {
	HTMLContainer,
	MediaHelpers,
	TLAsset,
	TLShapeView,
	TLVideoShape,
	WeakCache,
	definePlugin,
	shapeViewSlot,
	useEditor,
	useEditorComponents,
	useIsEditing,
} from '@tldraw/editor'
import classNames from 'classnames'
import { ReactEventHandler, memo, useCallback, useEffect, useRef, useState } from 'react'
import { BrokenAssetIcon } from '../shared/BrokenAssetIcon'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useEfficientZoomThreshold } from '../shared/useEfficientZoomThreshold'
import { useImageOrVideoAsset } from '../shared/useImageOrVideoAsset'
import { usePrefersReducedMotion } from '../shared/usePrefersReducedMotion'
import type { VideoShapeUtil } from './VideoShapeUtil'

const videoSvgExportCache = new WeakCache<TLAsset, Promise<string | null>>()

/** @public */
export const videoShapeView: TLShapeView<TLVideoShape, VideoShapeUtil> = {
	type: 'video',
	component(shape) {
		return <VideoShape shape={shape} />
	},

	async toSvg(shape, ctx, util) {
		const props = shape.props
		if (!props.assetId) return null

		const asset = util.editor.getAsset<TLAsset>(props.assetId)
		if (!asset) return null

		const promise = videoSvgExportCache.get(asset, async () => {
			const assetUrl = await ctx.resolveAssetUrl(asset.id, props.w)
			if (!assetUrl) return null
			const video = await MediaHelpers.loadVideo(assetUrl, util.editor.getContainerDocument())
			return await MediaHelpers.getVideoFrameAsDataUrl(video, 0)
		})
		const src = await promise.catch((error) => {
			// A failure must not stay memoized, or every later export of this asset fails too. Only
			// evict our own entry: a concurrent export may have started a fresh one. Skip the video
			// rather than rejecting: toSvg rejections are not caught by the exporter, which then
			// waits out the export delay and emits an SVG with no shapes at all.
			if (videoSvgExportCache.items.get(asset) === promise) videoSvgExportCache.items.delete(asset)
			console.error(`Could not export video ${asset.id}`, error)
			return null
		})

		if (!src) return null

		return <image href={src} width={props.w} height={props.h} aria-label={shape.props.altText} />
	},
}

/**
 * Draws video shapes with {@link videoShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const videoShapeViewPlugin = definePlugin({
	id: 'videoShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, videoShapeView),
})

const VideoShape = memo(function VideoShape({ shape }: { shape: TLVideoShape }) {
	const editor = useEditor()
	const showControls = !useEfficientZoomThreshold(110 / shape.props.w)
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

	const hasVideo = !!asset?.props.src && !!url && isLoaded

	return (
		<>
			<HTMLContainer
				id={shape.id}
				style={{
					color: 'var(--tl-color-text-3)',
					backgroundColor: hasVideo ? 'transparent' : 'var(--tl-color-low)',
					border: hasVideo ? 'none' : '1px solid var(--tl-color-low-border)',
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
