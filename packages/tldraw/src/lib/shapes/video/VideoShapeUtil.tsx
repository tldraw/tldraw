/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	HTMLContainer,
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
import { TextLabel } from '../shared/TextLabel'
import { LABEL_FONT_SIZES, LABEL_PADDING, TEXT_PROPS } from '../shared/default-shape-constants'
import { useAsset } from '../shared/useAsset'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
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

			// Text properties
			color: 'black',
			labelColor: 'black',
			fill: 'none',
			size: 'm',
			font: 'draw',
			text: '',
			align: 'middle',
			verticalAlign: 'middle',
		}
	}

	override getText(shape: TLVideoShape) {
		return shape.props.text
	}

	component(shape: TLVideoShape) {
		const { editor } = this
		const showControls = editor.getShapeGeometry(shape).bounds.w * editor.getZoomLevel() >= 110
		const { asset, url } = useAsset(shape.id, shape.props.assetId, shape.props.w)
		const isEditing = useIsEditing(shape.id)
		const prefersReducedMotion = usePrefersReducedMotion()
		const { Spinner } = useEditorComponents()
		const theme = useDefaultColorTheme()

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

		useEffect(() => {
			if (prefersReducedMotion) {
				const video = rVideo.current
				if (!video) return
				video.pause()
				video.currentTime = 0
			}
		}, [rVideo, prefersReducedMotion])

		const { fill, font, align, verticalAlign, size, text, color: labelColor } = shape.props
		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()

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

				<TextLabel
					id={shape.id}
					type={shape.type}
					font={font}
					fontSize={LABEL_FONT_SIZES[size]}
					lineHeight={TEXT_PROPS.lineHeight}
					padding={LABEL_PADDING}
					fill={fill}
					align={align}
					verticalAlign={verticalAlign}
					text={text}
					isSelected={isSelected}
					labelColor={theme[labelColor].solid}
					wrap
				/>
			</>
		)
	}

	indicator(shape: TLVideoShape) {
		return <rect width={toDomPrecision(shape.props.w)} height={toDomPrecision(shape.props.h)} />
	}

	override toSvg(shape: TLVideoShape) {
		return <image href={serializeVideo(shape.id)} width={shape.props.w} height={shape.props.h} />
	}
}

// Function from v1, could be improved but explicitly using this.model.time (?)
function serializeVideo(id: string): string {
	const splitId = id.split(':')[1]
	const video = document.querySelector(`.tl-video-shape-${splitId}`) as HTMLVideoElement
	if (video) {
		const canvas = document.createElement('canvas')
		canvas.width = video.videoWidth
		canvas.height = video.videoHeight
		canvas.getContext('2d')!.drawImage(video, 0, 0)
		return canvas.toDataURL('image/png')
	} else throw new Error('Video with not found when attempting serialization.')
}
