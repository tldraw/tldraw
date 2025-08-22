import {
	BaseBoxShapeUtil,
	Editor,
	Ellipse2d,
	FileHelpers,
	Geometry2d,
	HTMLContainer,
	Image,
	MediaHelpers,
	Rectangle2d,
	SvgExportContext,
	TLAsset,
	TLAssetId,
	TLImageShape,
	TLImageShapeProps,
	TLResizeInfo,
	TLShapePartial,
	Vec,
	WeakCache,
	fetch,
	imageShapeMigrations,
	imageShapeProps,
	lerp,
	modulate,
	resizeBox,
	structuredClone,
	toDomPrecision,
	useEditor,
	useUniqueSafeId,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import { memo, useEffect, useState } from 'react'
import { BrokenAssetIcon } from '../shared/BrokenAssetIcon'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { getUncroppedSize } from '../shared/crop'
import { useImageOrVideoAsset } from '../shared/useImageOrVideoAsset'
import { usePrefersReducedMotion } from '../shared/usePrefersReducedMotion'

async function getDataURIFromURL(url: string): Promise<string> {
	const response = await fetch(url)
	const blob = await response.blob()
	return FileHelpers.blobToDataUrl(blob)
}

const imageSvgExportCache = new WeakCache<TLAsset, Promise<string | null>>()

/** @public */
export class ImageShapeUtil extends BaseBoxShapeUtil<TLImageShape> {
	static override type = 'image' as const
	static override props = imageShapeProps
	static override migrations = imageShapeMigrations

	override isAspectRatioLocked() {
		return true
	}
	override canCrop() {
		return true
	}
	override isExportBoundsContainer(): boolean {
		return true
	}

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
			altText: '',
		}
	}

	override getGeometry(shape: TLImageShape): Geometry2d {
		if (shape.props.crop?.isCircle) {
			return new Ellipse2d({
				width: shape.props.w,
				height: shape.props.h,
				isFilled: true,
			})
		}

		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	override getAriaDescriptor(shape: TLImageShape) {
		return shape.props.altText
	}

	override onResize(shape: TLImageShape, info: TLResizeInfo<TLImageShape>) {
		let resized: TLImageShape = resizeBox(shape, info)
		const { flipX, flipY } = info.initialShape.props
		const { scaleX, scaleY, mode } = info

		resized = {
			...resized,
			props: {
				...resized.props,
				flipX: scaleX < 0 !== flipX,
				flipY: scaleY < 0 !== flipY,
			},
		}
		if (!shape.props.crop) return resized

		const flipCropHorizontally =
			// We used the flip horizontally feature
			(mode === 'scale_shape' && scaleX === -1) ||
			// We resized the shape past it's bounds, so it flipped
			(mode === 'resize_bounds' && flipX !== resized.props.flipX)
		const flipCropVertically =
			// We used the flip vertically feature
			(mode === 'scale_shape' && scaleY === -1) ||
			// We resized the shape past it's bounds, so it flipped
			(mode === 'resize_bounds' && flipY !== resized.props.flipY)

		const { topLeft, bottomRight } = shape.props.crop
		resized.props.crop = {
			topLeft: {
				x: flipCropHorizontally ? 1 - bottomRight.x : topLeft.x,
				y: flipCropVertically ? 1 - bottomRight.y : topLeft.y,
			},
			bottomRight: {
				x: flipCropHorizontally ? 1 - topLeft.x : bottomRight.x,
				y: flipCropVertically ? 1 - topLeft.y : bottomRight.y,
			},
			isCircle: shape.props.crop.isCircle,
		}
		return resized
	}

	component(shape: TLImageShape) {
		return <ImageShape shape={shape} />
	}

	indicator(shape: TLImageShape) {
		const isCropping = this.editor.getCroppingShapeId() === shape.id
		if (isCropping) return null

		if (shape.props.crop?.isCircle) {
			return (
				<ellipse
					cx={toDomPrecision(shape.props.w / 2)}
					cy={toDomPrecision(shape.props.h / 2)}
					rx={toDomPrecision(shape.props.w / 2)}
					ry={toDomPrecision(shape.props.h / 2)}
				/>
			)
		}

		return <rect width={toDomPrecision(shape.props.w)} height={toDomPrecision(shape.props.h)} />
	}

	override async toSvg(shape: TLImageShape, ctx: SvgExportContext) {
		const props = shape.props
		if (!props.assetId) return null

		const asset = this.editor.getAsset(props.assetId)

		if (!asset) return null

		const { w } = getUncroppedSize(shape.props, props.crop)

		const src = await imageSvgExportCache.get(asset, async () => {
			let src = await ctx.resolveAssetUrl(asset.id, w)
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

			// If it's animated then we need to get the first frame
			if (getIsAnimated(this.editor, asset.id)) {
				const { promise } = getFirstFrameOfAnimatedImage(src)
				src = await promise
			}
			return src
		})

		if (!src) return null

		return <SvgImage shape={shape} src={src} />
	}

	override onDoubleClickEdge(shape: TLImageShape) {
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
		const { w, h } = getUncroppedSize(shape.props, crop)

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
	override getInterpolatedProps(
		startShape: TLImageShape,
		endShape: TLImageShape,
		t: number
	): TLImageShapeProps {
		function interpolateCrop(
			startShape: TLImageShape,
			endShape: TLImageShape
		): TLImageShapeProps['crop'] {
			if (startShape.props.crop === null && endShape.props.crop === null) return null

			const startTL = startShape.props.crop?.topLeft || { x: 0, y: 0 }
			const startBR = startShape.props.crop?.bottomRight || { x: 1, y: 1 }
			const endTL = endShape.props.crop?.topLeft || { x: 0, y: 0 }
			const endBR = endShape.props.crop?.bottomRight || { x: 1, y: 1 }

			return {
				topLeft: { x: lerp(startTL.x, endTL.x, t), y: lerp(startTL.y, endTL.y, t) },
				bottomRight: { x: lerp(startBR.x, endBR.x, t), y: lerp(startBR.y, endBR.y, t) },
			}
		}

		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
			crop: interpolateCrop(startShape, endShape),
		}
	}
}

const ImageShape = memo(function ImageShape({ shape }: { shape: TLImageShape }) {
	const editor = useEditor()

	const { w } = getUncroppedSize(shape.props, shape.props.crop)
	const { asset, url } = useImageOrVideoAsset({
		shapeId: shape.id,
		assetId: shape.props.assetId,
		width: w,
	})

	const prefersReducedMotion = usePrefersReducedMotion()
	const [staticFrameSrc, setStaticFrameSrc] = useState('')
	const [loadedUrl, setLoadedUrl] = useState<null | string>(null)
	const isAnimated = asset && getIsAnimated(editor, asset.id)

	useEffect(() => {
		if (url && isAnimated) {
			const { promise, cancel } = getFirstFrameOfAnimatedImage(url)

			promise.then((dataUrl) => {
				setStaticFrameSrc(dataUrl)
				setLoadedUrl(url)
			})

			return () => {
				cancel()
			}
		}
	}, [editor, isAnimated, prefersReducedMotion, url])

	const showCropPreview = useValue(
		'show crop preview',
		() =>
			shape.id === editor.getOnlySelectedShapeId() &&
			editor.getCroppingShapeId() === shape.id &&
			editor.isIn('select.crop'),
		[editor, shape.id]
	)

	// We only want to reduce motion for mimeTypes that have motion
	const reduceMotion =
		prefersReducedMotion && (asset?.props.mimeType?.includes('video') || isAnimated)

	const containerStyle = getCroppedContainerStyle(shape)

	const nextSrc = url === loadedUrl ? null : url
	const loadedSrc = reduceMotion ? staticFrameSrc : loadedUrl

	// This logic path is for when it's broken/missing asset.
	if (!url && !asset?.props.src) {
		return (
			<HTMLContainer
				id={shape.id}
				style={{
					overflow: 'hidden',
					width: shape.props.w,
					height: shape.props.h,
					color: 'var(--tl-color-text-3)',
					backgroundColor: 'var(--tl-color-low)',
					border: '1px solid var(--tl-color-low-border)',
				}}
			>
				<div
					className={classNames('tl-image-container', asset && 'tl-image-container-loading')}
					style={containerStyle}
				>
					{asset ? null : <BrokenAssetIcon />}
				</div>
				{'url' in shape.props && shape.props.url && <HyperlinkButton url={shape.props.url} />}
			</HTMLContainer>
		)
	}

	// We don't set crossOrigin for non-animated images because for Cloudflare we don't currently
	// have that set up.
	const crossOrigin = isAnimated ? 'anonymous' : undefined

	return (
		<>
			{showCropPreview && loadedSrc && (
				<div style={containerStyle}>
					<img
						className="tl-image"
						style={{ ...getFlipStyle(shape), opacity: 0.1 }}
						crossOrigin={crossOrigin}
						src={loadedSrc}
						referrerPolicy="strict-origin-when-cross-origin"
						draggable={false}
						alt=""
					/>
				</div>
			)}
			<HTMLContainer
				id={shape.id}
				style={{
					overflow: 'hidden',
					width: shape.props.w,
					height: shape.props.h,
					borderRadius: shape.props.crop?.isCircle ? '50%' : undefined,
				}}
			>
				<div className={classNames('tl-image-container')} style={containerStyle}>
					{/* We have two images: the currently loaded image, and the next image that
					we're waiting to load. we keep the loaded image mounted while we're waiting
					for the next one by storing the loaded URL in state. We use `key` props with
					the src of the image so that when the next image is ready, the previous one will
					be unmounted and the next will be shown with the browser having to remount a
					fresh image and decoded it again from the cache. */}
					{loadedSrc && (
						<img
							key={loadedSrc}
							className="tl-image"
							style={getFlipStyle(shape)}
							crossOrigin={crossOrigin}
							src={loadedSrc}
							referrerPolicy="strict-origin-when-cross-origin"
							draggable={false}
							alt=""
						/>
					)}
					{nextSrc && (
						<img
							key={nextSrc}
							className="tl-image"
							style={getFlipStyle(shape)}
							crossOrigin={crossOrigin}
							src={nextSrc}
							referrerPolicy="strict-origin-when-cross-origin"
							draggable={false}
							alt={shape.props.altText}
							onLoad={() => setLoadedUrl(nextSrc)}
						/>
					)}
				</div>
				{shape.props.url && <HyperlinkButton url={shape.props.url} />}
			</HTMLContainer>
		</>
	)
})

function getIsAnimated(editor: Editor, assetId: TLAssetId) {
	const asset = assetId ? editor.getAsset(assetId) : undefined

	if (!asset) return false

	return (
		('mimeType' in asset.props && MediaHelpers.isAnimatedImageType(asset?.props.mimeType)) ||
		('isAnimated' in asset.props && asset.props.isAnimated)
	)
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

	const { w, h } = getUncroppedSize(shape.props, crop)
	const offsetX = -topLeft.x * w
	const offsetY = -topLeft.y * h
	return {
		transform: `translate(${offsetX}px, ${offsetY}px)`,
		width: w,
		height: h,
	}
}

function getFlipStyle(shape: TLImageShape, size?: { width: number; height: number }) {
	const { flipX, flipY, crop } = shape.props
	if (!flipX && !flipY) return undefined

	let cropOffsetX
	let cropOffsetY
	if (crop) {
		// We have to do all this extra math because of the whole transform origin around 0,0
		// instead of center in SVG-land, ugh.
		const { w, h } = getUncroppedSize(shape.props, crop)

		// Find the resulting w/h of the crop in normalized (0-1) coordinates
		const cropWidth = crop.bottomRight.x - crop.topLeft.x
		const cropHeight = crop.bottomRight.y - crop.topLeft.y

		// Map from the normalized crop coordinate space to shape pixel space
		cropOffsetX = modulate(crop.topLeft.x, [0, 1 - cropWidth], [0, w - shape.props.w])
		cropOffsetY = modulate(crop.topLeft.y, [0, 1 - cropHeight], [0, h - shape.props.h])
	}

	const scale = `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`
	const translate = size
		? `translate(${(flipX ? size.width : 0) - (cropOffsetX ? cropOffsetX : 0)}px,
		             ${(flipY ? size.height : 0) - (cropOffsetY ? cropOffsetY : 0)}px)`
		: ''

	return {
		transform: `${translate} ${scale}`,
		// in SVG, flipping around the center doesn't work so we use explicit width/height
		transformOrigin: size ? '0 0' : 'center center',
	}
}

function SvgImage({ shape, src }: { shape: TLImageShape; src: string }) {
	const cropClipId = useUniqueSafeId()
	const containerStyle = getCroppedContainerStyle(shape)
	const crop = shape.props.crop

	if (containerStyle.transform && crop) {
		const { transform: cropTransform, width, height } = containerStyle
		const croppedWidth = (crop.bottomRight.x - crop.topLeft.x) * width
		const croppedHeight = (crop.bottomRight.y - crop.topLeft.y) * height

		const points = [
			new Vec(0, 0),
			new Vec(croppedWidth, 0),
			new Vec(croppedWidth, croppedHeight),
			new Vec(0, croppedHeight),
		]

		const flip = getFlipStyle(shape, { width, height })

		return (
			<>
				<defs>
					<clipPath id={cropClipId}>
						{crop.isCircle ? (
							<ellipse
								cx={croppedWidth / 2}
								cy={croppedHeight / 2}
								rx={croppedWidth / 2}
								ry={croppedHeight / 2}
							/>
						) : (
							<polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
						)}
					</clipPath>
				</defs>
				<g clipPath={`url(#${cropClipId})`}>
					<image
						href={src}
						width={width}
						height={height}
						aria-label={shape.props.altText}
						style={flip ? { ...flip } : { transform: cropTransform }}
					/>
				</g>
			</>
		)
	} else {
		return (
			<image
				href={src}
				width={shape.props.w}
				height={shape.props.h}
				aria-label={shape.props.altText}
				style={getFlipStyle(shape, { width: shape.props.w, height: shape.props.h })}
			/>
		)
	}
}

function getFirstFrameOfAnimatedImage(url: string) {
	let cancelled = false

	const promise = new Promise<string>((resolve) => {
		const image = Image()
		image.onload = () => {
			if (cancelled) return

			const canvas = document.createElement('canvas')
			canvas.width = image.width
			canvas.height = image.height

			const ctx = canvas.getContext('2d')
			if (!ctx) return

			ctx.drawImage(image, 0, 0)
			resolve(canvas.toDataURL())
		}
		image.crossOrigin = 'anonymous'
		image.src = url
	})

	return { promise, cancel: () => (cancelled = true) }
}
