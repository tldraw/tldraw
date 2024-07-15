/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	FileHelpers,
	HTMLContainer,
	Image,
	MediaHelpers,
	TLImageShape,
	TLOnDoubleClickHandler,
	TLOnResizeHandler,
	TLShapePartial,
	Vec,
	fetch,
	imageShapeMigrations,
	imageShapeProps,
	resizeBox,
	structuredClone,
	toDomPrecision,
} from '@tldraw/editor'
import classNames from 'classnames'
import { useEffect, useState } from 'react'
import { BrokenAssetIcon } from '../shared/BrokenAssetIcon'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useAsset } from '../shared/useAsset'
import { usePrefersReducedMotion } from '../shared/usePrefersReducedMotion'

async function getDataURIFromURL(url: string): Promise<string> {
	const response = await fetch(url)
	const blob = await response.blob()
	return FileHelpers.blobToDataUrl(blob)
}

/** @public */
export class ImageShapeUtil extends BaseBoxShapeUtil<TLImageShape> {
	static override type = 'image' as const
	static override props = imageShapeProps
	static override migrations = imageShapeMigrations

	override isAspectRatioLocked = () => true
	override canCrop = () => true

	override getDefaultProps(): TLImageShape['props'] {
		return {
			w: 100,
			h: 100,
			assetId: null,
			playing: true,
			url: '',
			crop: null,
			flipX: false,
			flipY: false,
		}
	}

	override onResize: TLOnResizeHandler<any> = (shape: TLImageShape, info) => {
		let resized: TLImageShape = resizeBox(shape, info)
		const { flipX, flipY } = info.initialShape.props

		resized = {
			...resized,
			props: {
				...resized.props,
				flipX: info.scaleX < 0 !== flipX,
				flipY: info.scaleY < 0 !== flipY,
			},
		}
		return resized
	}

	isAnimated(shape: TLImageShape) {
		const asset = shape.props.assetId ? this.editor.getAsset(shape.props.assetId) : undefined

		if (!asset) return false

		return (
			('mimeType' in asset.props && MediaHelpers.isAnimatedImageType(asset?.props.mimeType)) ||
			('isAnimated' in asset.props && asset.props.isAnimated)
		)
	}

	component(shape: TLImageShape) {
		const isCropping = this.editor.getCroppingShapeId() === shape.id
		const prefersReducedMotion = usePrefersReducedMotion()
		const [staticFrameSrc, setStaticFrameSrc] = useState('')
		const [loadedSrc, setLoadedSrc] = useState('')
		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()
		const { asset, url } = useAsset(shape.id, shape.props.assetId, shape.props.w)

		useEffect(() => {
			// We preload the image because we might have different source urls for different
			// zoom levels.
			// Preloading the image ensures that the browser caches the image and doesn't
			// cause visual flickering when the image is loaded.
			if (url) {
				let cancelled = false

				const image = Image()
				image.onload = () => {
					if (cancelled) return
					setLoadedSrc(url)
				}
				image.src = url

				return () => {
					cancelled = true
				}
			}
		}, [url, shape])

		useEffect(() => {
			if (url && this.isAnimated(shape)) {
				let cancelled = false

				const image = Image()
				image.onload = () => {
					if (cancelled) return

					const canvas = document.createElement('canvas')
					canvas.width = image.width
					canvas.height = image.height

					const ctx = canvas.getContext('2d')
					if (!ctx) return

					ctx.drawImage(image, 0, 0)
					setStaticFrameSrc(canvas.toDataURL())
					setLoadedSrc(url)
				}
				image.crossOrigin = 'anonymous'
				image.src = url

				return () => {
					cancelled = true
				}
			}
		}, [prefersReducedMotion, url, shape])

		if (asset?.type === 'bookmark') {
			throw Error("Bookmark assets can't be rendered as images")
		}

		const showCropPreview = isSelected && isCropping && this.editor.isIn('select.crop')

		// We only want to reduce motion for mimeTypes that have motion
		const reduceMotion =
			prefersReducedMotion && (asset?.props.mimeType?.includes('video') || this.isAnimated(shape))

		const containerStyle = getCroppedContainerStyle(shape)

		// This is specifically `asset?.props.src` and not `url` because we're looking for broken assets.
		if (!asset?.props.src) {
			return (
				<HTMLContainer
					id={shape.id}
					style={{
						overflow: 'hidden',
						width: shape.props.w,
						height: shape.props.h,
						color: 'var(--color-text-3)',
						backgroundColor: asset ? 'transparent' : 'var(--color-low)',
						border: asset ? 'none' : '1px solid var(--color-low-border)',
					}}
				>
					<div className="tl-image-container" style={containerStyle}>
						{asset ? null : <BrokenAssetIcon />}
					</div>
					{'url' in shape.props && shape.props.url && (
						<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.getZoomLevel()} />
					)}
				</HTMLContainer>
			)
		}

		if (!loadedSrc) return null

		return (
			<>
				{showCropPreview && (
					<div style={containerStyle}>
						<img
							className="tl-image"
							// We don't set crossOrigin for non-animated images because
							// for Cloudflare we don't currenly have that set up.
							crossOrigin={this.isAnimated(shape) ? 'anonymous' : undefined}
							src={!shape.props.playing || reduceMotion ? staticFrameSrc : loadedSrc}
							referrerPolicy="strict-origin-when-cross-origin"
							style={{
								opacity: 0.1,
							}}
							draggable={false}
						/>
					</div>
				)}
				<HTMLContainer
					id={shape.id}
					style={{ overflow: 'hidden', width: shape.props.w, height: shape.props.h }}
				>
					<div className="tl-image-container" style={containerStyle}>
						<img
							className={classNames('tl-image', {
								'tl-flip-x': shape.props.flipX && !shape.props.flipY,
								'tl-flip-y': shape.props.flipY && !shape.props.flipX,
								'tl-flip-xy': shape.props.flipY && shape.props.flipX,
							})}
							// We don't set crossOrigin for non-animated images because
							// for Cloudflare we don't currenly have that set up.
							crossOrigin={this.isAnimated(shape) ? 'anonymous' : undefined}
							src={!shape.props.playing || reduceMotion ? staticFrameSrc : loadedSrc}
							referrerPolicy="strict-origin-when-cross-origin"
							draggable={false}
						/>
						{this.isAnimated(shape) && !shape.props.playing && (
							<div className="tl-image__tg">GIF</div>
						)}
					</div>
					{shape.props.url && (
						<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.getZoomLevel()} />
					)}
				</HTMLContainer>
			</>
		)
	}

	indicator(shape: TLImageShape) {
		const isCropping = this.editor.getCroppingShapeId() === shape.id
		if (isCropping) return null
		return <rect width={toDomPrecision(shape.props.w)} height={toDomPrecision(shape.props.h)} />
	}

	override async toSvg(shape: TLImageShape) {
		if (!shape.props.assetId) return null

		const asset = this.editor.getAsset(shape.props.assetId)

		if (!asset) return null

		let src = await this.editor.resolveAssetUrl(shape.props.assetId, {
			shouldResolveToOriginal: true,
		})
		if (!src) return null
		if (
			src.startsWith('blob:') ||
			src.startsWith('http') ||
			src.startsWith('/') ||
			src.startsWith('./')
		) {
			// If it's a remote image, we need to fetch it and convert it to a data URI
			src = (await getDataURIFromURL(src)) || ''
		}

		const containerStyle = getCroppedContainerStyle(shape)
		const crop = shape.props.crop
		if (containerStyle.transform && crop) {
			const { transform, width, height } = containerStyle
			const croppedWidth = (crop.bottomRight.x - crop.topLeft.x) * width
			const croppedHeight = (crop.bottomRight.y - crop.topLeft.y) * height

			const points = [
				new Vec(0, 0),
				new Vec(croppedWidth, 0),
				new Vec(croppedWidth, croppedHeight),
				new Vec(0, croppedHeight),
			]

			const cropClipId = `cropClipPath_${shape.id.replace(':', '_')}`
			return (
				<>
					<defs>
						<clipPath id={cropClipId}>
							<polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
						</clipPath>
					</defs>
					<g clipPath={`url(#${cropClipId})`}>
						<image href={src} width={width} height={height} style={{ transform }} />
					</g>
				</>
			)
		} else {
			return <image href={src} width={shape.props.w} height={shape.props.h} />
		}
	}

	override onDoubleClick = (shape: TLImageShape) => {
		const asset = shape.props.assetId ? this.editor.getAsset(shape.props.assetId) : undefined

		if (!asset) return

		const canPlay = asset.props.src && this.isAnimated(shape)

		if (!canPlay) return

		this.editor.updateShapes([
			{
				type: 'image',
				id: shape.id,
				props: {
					playing: !shape.props.playing,
				},
			},
		])
	}

	override onDoubleClickEdge: TLOnDoubleClickHandler<TLImageShape> = (shape) => {
		const props = shape.props
		if (!props) return

		if (this.editor.getCroppingShapeId() !== shape.id) {
			return
		}

		const crop = structuredClone(props.crop) || {
			topLeft: { x: 0, y: 0 },
			bottomRight: { x: 1, y: 1 },
		}

		// The true asset dimensions
		const w = (1 / (crop.bottomRight.x - crop.topLeft.x)) * shape.props.w
		const h = (1 / (crop.bottomRight.y - crop.topLeft.y)) * shape.props.h

		const pointDelta = new Vec(crop.topLeft.x * w, crop.topLeft.y * h).rot(shape.rotation)

		const partial: TLShapePartial<TLImageShape> = {
			id: shape.id,
			type: shape.type,
			x: shape.x - pointDelta.x,
			y: shape.y - pointDelta.y,
			props: {
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
				w,
				h,
			},
		}

		this.editor.updateShapes([partial])
	}
}

/**
 * When an image is cropped we need to translate the image to show the portion withing the cropped
 * area. We do this by translating the image by the negative of the top left corner of the crop
 * area.
 *
 * @param shape - Shape The image shape for which to get the container style
 * @returns - Styles to apply to the image container
 */
function getCroppedContainerStyle(shape: TLImageShape) {
	const crop = shape.props.crop
	const topLeft = crop?.topLeft
	if (!topLeft) {
		return {
			width: shape.props.w,
			height: shape.props.h,
		}
	}

	const w = (1 / (crop.bottomRight.x - crop.topLeft.x)) * shape.props.w
	const h = (1 / (crop.bottomRight.y - crop.topLeft.y)) * shape.props.h

	const offsetX = -topLeft.x * w
	const offsetY = -topLeft.y * h
	return {
		transform: `translate(${offsetX}px, ${offsetY}px)`,
		width: w,
		height: h,
	}
}
