/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	Box,
	Editor,
	Group2d,
	HTMLContainer,
	MediaHelpers,
	Rectangle2d,
	SvgExportContext,
	TLAsset,
	TLVideoShape,
	getDefaultColorTheme,
	toDomPrecision,
	useEditorComponents,
	useIsEditing,
	videoShapeMigrations,
	videoShapeProps,
} from '@tldraw/editor'
import classNames from 'classnames'
import { ReactEventHandler, memo, useCallback, useEffect, useRef, useState } from 'react'
import { BrokenAssetIcon } from '../shared/BrokenAssetIcon'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { SvgTextLabel } from '../shared/SvgTextLabel'
import { TextLabel } from '../shared/TextLabel'
import {
	FONT_FAMILIES,
	LABEL_FONT_SIZES,
	LABEL_PADDING,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { useImageOrVideoAsset } from '../shared/useImageOrVideoAsset'
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

	override getGeometry(shape: TLVideoShape) {
		const children = [
			new Rectangle2d({
				width: shape.props.w,
				height: shape.props.h,
				isFilled: true,
			}),
		]

		if (shape.props.text) {
			const textDimensions = this.editor.textMeasure.measureText(shape.props.text, {
				...TEXT_PROPS,
				fontFamily: FONT_FAMILIES[shape.props.font],
				fontSize: LABEL_FONT_SIZES[shape.props.size],
				maxWidth: shape.props.w - LABEL_PADDING * 2,
			})

			children.push(
				new Rectangle2d({
					x: 0,
					y: shape.props.h + LABEL_PADDING,
					width: shape.props.w,
					height: textDimensions.h,
					isFilled: true,
					isLabel: true,
				})
			)
		}

		return new Group2d({ children })
	}

	component(shape: TLVideoShape) {
		const { asset, url } = useImageOrVideoAsset({
			shapeId: shape.id,
			assetId: shape.props.assetId,
		})

		return <VideoShape editor={this.editor} shape={shape} asset={asset} url={url} />
	}

	indicator(shape: TLVideoShape) {
		return <rect width={toDomPrecision(shape.props.w)} height={toDomPrecision(shape.props.h)} />
	}

	override async toSvg(shape: TLVideoShape, ctx: SvgExportContext) {
		const image = await serializeVideo(this.editor, shape)
		if (!image) return null
		const props = shape.props

		let textEl
		if (props.text) {
			ctx.addExportDef(getFontDefForExport(props.font))
			const theme = getDefaultColorTheme(ctx)

			const textDimensions = this.editor.textMeasure.measureText(props.text, {
				...TEXT_PROPS,
				fontFamily: FONT_FAMILIES[props.font],
				fontSize: LABEL_FONT_SIZES[props.size],
				maxWidth: props.w - LABEL_PADDING * 2,
			})
			const bounds = new Box(0, props.h + LABEL_PADDING, props.w, textDimensions.h)
			textEl = (
				<SvgTextLabel
					fontSize={LABEL_FONT_SIZES[props.size]}
					font={props.font}
					align={props.align}
					verticalAlign={props.verticalAlign}
					text={props.text}
					labelColor={theme[props.labelColor].solid}
					bounds={bounds}
					padding={LABEL_PADDING}
				/>
			)
		}

		return (
			<>
				<image href={image} width={shape.props.w} height={shape.props.h} />
				{textEl}
			</>
		)
	}
}

const VideoShape = memo(function VideoShape({
	editor,
	shape,
	asset,
	url,
}: {
	editor: Editor
	shape: TLVideoShape
	asset?: TLAsset | null
	url: string | null
}) {
	const showControls = editor.getShapeGeometry(shape).bounds.w * editor.getZoomLevel() >= 110
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
	const isSelected = shape.id === editor.getOnlySelectedShapeId()

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
			{'url' in shape.props && shape.props.url && <HyperlinkButton url={shape.props.url} />}

			<TextLabel
				shapeId={shape.id}
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
})

async function serializeVideo(editor: Editor, shape: TLVideoShape): Promise<string | null> {
	const assetUrl = await editor.resolveAssetUrl(shape.props.assetId, {
		shouldResolveToOriginal: true,
	})
	if (!assetUrl) return null

	const video = await MediaHelpers.loadVideo(assetUrl)
	return MediaHelpers.getVideoFrameAsDataUrl(video, 0)
}
