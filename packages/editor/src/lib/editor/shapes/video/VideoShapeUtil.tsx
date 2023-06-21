import { toDomPrecision } from '@tldraw/primitives'
import { track } from '@tldraw/state'
import { TLVideoShape } from '@tldraw/tlschema'
import * as React from 'react'
import { DefaultSpinner } from '../../../components/DefaultSpinner'
import { HTMLContainer } from '../../../components/HTMLContainer'
import { useIsEditing } from '../../../hooks/useIsEditing'
import { usePrefersReducedMotion } from '../../../utils/dom'
import { BaseBoxShapeUtil } from '../BaseBoxShapeUtil'
import { HyperlinkButton } from '../shared/HyperlinkButton'

/** @public */
export class VideoShapeUtil extends BaseBoxShapeUtil<TLVideoShape> {
	static override type = 'video' as const

	override canEdit = () => true
	override isAspectRatioLocked = () => true

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
		return <TLVideoUtilComponent shape={shape} videoUtil={this} />
	}

	indicator(shape: TLVideoShape) {
		return <rect width={toDomPrecision(shape.props.w)} height={toDomPrecision(shape.props.h)} />
	}

	toSvg(shape: TLVideoShape) {
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
		const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
		image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', serializeVideo(shape.id))
		image.setAttribute('width', shape.props.w.toString())
		image.setAttribute('height', shape.props.h.toString())
		g.appendChild(image)

		return g
	}
}

// Function from v1, could be improved bu explicitly using this.model.time (?)
function serializeVideo(id: string): string {
	const splitId = id.split(':')[1]
	const video = document.querySelector(`.tl-video-shape-${splitId}`) as HTMLVideoElement
	if (video) {
		const canvas = document.createElement('canvas')
		canvas.width = video.videoWidth
		canvas.height = video.videoHeight
		canvas.getContext('2d')!.drawImage(video, 0, 0)
		return canvas.toDataURL('image/png')
	} else throw new Error('Video with id ' + splitId + ' not found')
}

const TLVideoUtilComponent = track(function TLVideoUtilComponent(props: {
	shape: TLVideoShape
	videoUtil: VideoShapeUtil
}) {
	const { shape, videoUtil } = props
	const showControls = videoUtil.editor.getBounds(shape).w * videoUtil.editor.zoomLevel >= 110
	const asset = shape.props.assetId ? videoUtil.editor.getAssetById(shape.props.assetId) : null
	const { w, h, time, playing } = shape.props
	const isEditing = useIsEditing(shape.id)
	const prefersReducedMotion = usePrefersReducedMotion()

	const rVideo = React.useRef<HTMLVideoElement>(null!)

	const handlePlay = React.useCallback<React.ReactEventHandler<HTMLVideoElement>>(
		(e) => {
			const video = e.currentTarget

			videoUtil.editor.updateShapes([
				{
					type: 'video',
					id: shape.id,
					props: {
						playing: true,
						time: video.currentTime,
					},
				},
			])
		},
		[shape.id, videoUtil.editor]
	)

	const handlePause = React.useCallback<React.ReactEventHandler<HTMLVideoElement>>(
		(e) => {
			const video = e.currentTarget

			videoUtil.editor.updateShapes([
				{
					type: 'video',
					id: shape.id,
					props: {
						playing: false,
						time: video.currentTime,
					},
				},
			])
		},
		[shape.id, videoUtil.editor]
	)

	const handleSetCurrentTime = React.useCallback<React.ReactEventHandler<HTMLVideoElement>>(
		(e) => {
			const video = e.currentTarget

			if (isEditing) {
				videoUtil.editor.updateShapes([
					{
						type: 'video',
						id: shape.id,
						props: {
							time: video.currentTime,
						},
					},
				])
			}
		},
		[isEditing, shape.id, videoUtil.editor]
	)

	const [isLoaded, setIsLoaded] = React.useState(false)

	const handleLoadedData = React.useCallback<React.ReactEventHandler<HTMLVideoElement>>(
		(e) => {
			const video = e.currentTarget
			if (time !== video.currentTime) {
				video.currentTime = time
			}

			if (!playing) {
				video.pause()
			}

			setIsLoaded(true)
		},
		[playing, time]
	)

	// If the current time changes and we're not editing the video, update the video time
	React.useEffect(() => {
		const video = rVideo.current

		if (!video) return

		if (isLoaded && !isEditing && time !== video.currentTime) {
			video.currentTime = time
		}
	}, [isEditing, isLoaded, time])

	React.useEffect(() => {
		if (prefersReducedMotion) {
			const video = rVideo.current
			video.pause()
			video.currentTime = 0
		}
	}, [rVideo, prefersReducedMotion])

	return (
		<>
			<HTMLContainer id={shape.id}>
				<div className="tl-counter-scaled">
					{asset?.props.src ? (
						<video
							ref={rVideo}
							className={`tl-video tl-video-shape-${shape.id.split(':')[1]} tl-hitarea-stroke`}
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
							onPlay={handlePlay}
							onPause={handlePause}
							onTimeUpdate={handleSetCurrentTime}
							onLoadedData={handleLoadedData}
							hidden={!isLoaded}
						>
							<source src={asset.props.src} />
						</video>
					) : (
						<g transform={`translate(${(w - 38) / 2}, ${(h - 38) / 2})`}>
							<DefaultSpinner />
						</g>
					)}
				</div>
			</HTMLContainer>
			{'url' in shape.props && shape.props.url && (
				<HyperlinkButton url={shape.props.url} zoomLevel={videoUtil.editor.zoomLevel} />
			)}
		</>
	)
})
