import {
	Editor,
	FileHelpers,
	HTMLContainer,
	Image,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	TLImageShape,
	TLShapeView,
	Vec,
	WeakCache,
	definePlugin,
	fetch,
	getGlobalDocument,
	modulate,
	shapeViewSlot,
	useEditor,
	useUniqueSafeId,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import { memo, useEffect, useState } from 'react'
import { BrokenAssetIcon } from '../shared/BrokenAssetIcon'
import { getUncroppedSize } from '../shared/crop'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useImageOrVideoAsset } from '../shared/useImageOrVideoAsset'
import { usePrefersReducedMotion } from '../shared/usePrefersReducedMotion'
import { TRANSPARENT_IMAGE_MIMETYPES, preloadAlphaData } from './ImageAlphaCache'
import type { ImageShapeUtil } from './ImageShapeUtil'

async function getDataURIFromURL(url: string): Promise<string> {
	const response = await fetch(url)
	const blob = await response.blob()
	return FileHelpers.blobToDataUrl(blob)
}

const imageSvgExportCache = new WeakCache<TLAsset, Promise<string | null>>()

/** @public */
export const imageShapeView: TLShapeView<TLImageShape, ImageShapeUtil> = {
	type: 'image',
	component(shape) {
		return <ImageShape shape={shape} />
	},

	async toSvg(shape, ctx, util) {
		const props = shape.props
		if (!props.assetId) return null

		const asset = util.editor.getAsset(props.assetId)

		if (!asset) return null

		const { w } = getUncroppedSize(shape.props, props.crop)

		const promise = imageSvgExportCache.get(asset, async () => {
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
			if (getIsAnimated(util.editor, asset.id)) {
				const { promise } = getFirstFrameOfAnimatedImage(src)
				src = await promise
			}
			return src
		})
		const src = await promise.catch((error) => {
			// A failure (e.g. a CORS-blocked fetch) must not stay memoized, or every later export of
			// this asset fails too. Only evict our own entry: a concurrent export may have started a
			// fresh one in the meantime. Skip the image rather than failing the whole export.
			if (imageSvgExportCache.items.get(asset) === promise) imageSvgExportCache.items.delete(asset)
			console.error(`Could not export image ${asset.id}`, error)
			return null
		})

		if (!src) return null

		return <SvgImage shape={shape} src={src} />
	},
}

/**
 * Draws image shapes with {@link imageShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const imageShapeViewPlugin = definePlugin({
	id: 'imageShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, imageShapeView),
})

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

			promise.then(
				(dataUrl) => {
					setStaticFrameSrc(dataUrl)
					setLoadedUrl(url)
				},
				() => {
					// couldn't decode a first frame; keep showing the animated source
				}
			)

			return () => {
				cancel()
			}
		}
		return undefined
	}, [editor, isAnimated, prefersReducedMotion, url])

	const mimeType = asset && 'mimeType' in asset.props ? asset.props.mimeType : null
	const supportsTransparency = mimeType != null && TRANSPARENT_IMAGE_MIMETYPES.includes(mimeType)
	const assetSrc = asset && 'src' in asset.props ? asset.props.src : null

	useEffect(() => {
		if (url && supportsTransparency) {
			// Cache under asset.props.src so getGeometry (which only has the asset
			// record) can look up the data even when the resolved URL differs.
			preloadAlphaData(url, assetSrc ?? undefined)
		}
	}, [url, supportsTransparency, assetSrc])

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
							alt={shape.props.altText}
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

	// Must settle on failure too: an image that never loads would otherwise leave the
	// export awaiting this promise forever.
	const promise = new Promise<string>((resolve, reject) => {
		const image = Image()
		image.onload = () => {
			if (cancelled) return

			const canvas = getGlobalDocument().createElement('canvas')
			canvas.width = image.width
			canvas.height = image.height

			const ctx = canvas.getContext('2d')
			if (!ctx) {
				reject(new Error('Could not get a 2d canvas context'))
				return
			}

			ctx.drawImage(image, 0, 0)
			resolve(canvas.toDataURL())
		}
		image.onerror = () => {
			if (cancelled) return
			reject(new Error(`Could not load image: ${url}`))
		}
		image.crossOrigin = 'anonymous'
		image.src = url
	})

	return { promise, cancel: () => (cancelled = true) }
}
