/* eslint-disable react-hooks/rules-of-hooks */
import { Vec2d, toDomPrecision } from '@tldraw/primitives'
import { useValue } from '@tldraw/state'
import { TLImageShape, TLShapePartial } from '@tldraw/tlschema'
import { deepCopy } from '@tldraw/utils'
import { useEffect, useState } from 'react'
import { DefaultSpinner } from '../../../components/DefaultSpinner'
import { HTMLContainer } from '../../../components/HTMLContainer'
import { useIsCropping } from '../../../hooks/useIsCropping'
import { usePrefersReducedMotion } from '../../../utils/dom'
import { BaseBoxShapeUtil } from '../BaseBoxShapeUtil'
import { TLOnDoubleClickHandler } from '../ShapeUtil'
import { HyperlinkButton } from '../shared/HyperlinkButton'

const loadImage = async (url: string): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.onload = () => resolve(image)
		image.onerror = () => reject(new Error('Failed to load image'))
		image.crossOrigin = 'anonymous'
		image.src = url
	})
}

const getStateFrame = async (url: string) => {
	const image = await loadImage(url)

	const canvas = document.createElement('canvas')
	canvas.width = image.width
	canvas.height = image.height

	const ctx = canvas.getContext('2d')
	if (!ctx) return

	ctx.drawImage(image, 0, 0)
	return canvas.toDataURL()
}

async function getDataURIFromURL(url: string): Promise<string> {
	const response = await fetch(url)
	const blob = await response.blob()
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onloadend = () => resolve(reader.result as string)
		reader.onerror = reject
		reader.readAsDataURL(blob)
	})
}

/** @public */
export class ImageShapeUtil extends BaseBoxShapeUtil<TLImageShape> {
	static override type = 'image' as const

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
		}
	}

	component(shape: TLImageShape) {
		const containerStyle = getContainerStyle(shape)
		const isCropping = useIsCropping(shape.id)
		const prefersReducedMotion = usePrefersReducedMotion()
		const [staticFrameSrc, setStaticFrameSrc] = useState('')

		const { w, h } = shape.props
		const asset = shape.props.assetId ? this.editor.getAssetById(shape.props.assetId) : undefined

		if (asset?.type === 'bookmark') {
			throw Error("Bookmark assets can't be rendered as images")
		}

		const isSelected = useValue(
			'onlySelectedShape',
			() => shape.id === this.editor.onlySelectedShape?.id,
			[this.editor]
		)

		const showCropPreview =
			isSelected &&
			isCropping &&
			this.editor.isInAny('select.crop', 'select.cropping', 'select.pointing_crop_handle')

		// We only want to reduce motion for mimeTypes that have motion
		const reduceMotion =
			prefersReducedMotion &&
			(asset?.props.mimeType?.includes('video') || asset?.props.mimeType?.includes('gif'))

		useEffect(() => {
			if (asset?.props.src && 'mimeType' in asset.props && asset?.props.mimeType === 'image/gif') {
				let cancelled = false
				const run = async () => {
					const newStaticFrame = await getStateFrame(asset.props.src!)
					if (cancelled) return
					if (newStaticFrame) {
						setStaticFrameSrc(newStaticFrame)
					}
				}
				run()

				return () => {
					cancelled = true
				}
			}
		}, [prefersReducedMotion, asset?.props])

		return (
			<>
				{asset?.props.src && showCropPreview && (
					<div style={containerStyle}>
						<div
							className={`tl-image tl-image-${shape.id}-crop`}
							style={{
								opacity: 0.1,
								backgroundImage: `url(${
									!shape.props.playing || reduceMotion ? staticFrameSrc : asset.props.src
								})`,
							}}
							draggable={false}
						/>
					</div>
				)}
				<HTMLContainer id={shape.id} style={{ overflow: 'hidden' }}>
					<div className="tl-image-container" style={containerStyle}>
						{asset?.props.src ? (
							<div
								className={`tl-image tl-image-${shape.id}`}
								style={{
									backgroundImage: `url(${
										!shape.props.playing || reduceMotion ? staticFrameSrc : asset.props.src
									})`,
								}}
								draggable={false}
							/>
						) : (
							<g transform={`translate(${(w - 38) / 2}, ${(h - 38) / 2})`}>
								<DefaultSpinner />
							</g>
						)}
						{asset?.props.isAnimated && !shape.props.playing && (
							<div className="tl-image__tg">GIF</div>
						)}
					</div>
				</HTMLContainer>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.zoomLevel} />
				)}
			</>
		)
	}

	indicator(shape: TLImageShape) {
		const isCropping = useIsCropping(shape.id)
		if (isCropping) {
			return null
		}
		return <rect width={toDomPrecision(shape.props.w)} height={toDomPrecision(shape.props.h)} />
	}

	async toSvg(shape: TLImageShape) {
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
		const asset = shape.props.assetId ? this.editor.getAssetById(shape.props.assetId) : null

		let src = asset?.props.src || ''
		if (src && src.startsWith('http')) {
			// If it's a remote image, we need to fetch it and convert it to a data URI
			src = (await getDataURIFromURL(src)) || ''
		}

		const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
		image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', src)
		const containerStyle = getContainerStyle(shape)
		const crop = shape.props.crop
		if (containerStyle && crop) {
			const { transform, width, height } = containerStyle
			const points = [
				new Vec2d(crop.topLeft.x * width, crop.topLeft.y * height),
				new Vec2d(crop.bottomRight.x * width, crop.topLeft.y * height),
				new Vec2d(crop.bottomRight.x * width, crop.bottomRight.y * height),
				new Vec2d(crop.topLeft.x * width, crop.bottomRight.y * height),
			]
			const innerElement = document.createElementNS('http://www.w3.org/2000/svg', 'g')
			innerElement.style.clipPath = `polygon(${points.map((p) => `${p.x}px ${p.y}px`).join(',')})`
			image.setAttribute('width', width.toString())
			image.setAttribute('height', height.toString())
			image.style.transform = transform
			innerElement.appendChild(image)
			g.appendChild(innerElement)
		} else {
			image.setAttribute('width', shape.props.w.toString())
			image.setAttribute('height', shape.props.h.toString())
			g.appendChild(image)
		}

		return g
	}

	onDoubleClick = (shape: TLImageShape) => {
		const asset = shape.props.assetId ? this.editor.getAssetById(shape.props.assetId) : undefined

		if (!asset) return

		const canPlay =
			asset.props.src && 'mimeType' in asset.props && asset.props.mimeType === 'image/gif'

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

	onDoubleClickEdge: TLOnDoubleClickHandler<TLImageShape> = (shape) => {
		const props = shape.props
		if (!props) return

		if (this.editor.croppingId !== shape.id) {
			return
		}

		const crop = deepCopy(props.crop) || {
			topLeft: { x: 0, y: 0 },
			bottomRight: { x: 1, y: 1 },
		}

		// The true asset dimensions
		const w = (1 / (crop.bottomRight.x - crop.topLeft.x)) * shape.props.w
		const h = (1 / (crop.bottomRight.y - crop.topLeft.y)) * shape.props.h

		const pointDelta = new Vec2d(crop.topLeft.x * w, crop.topLeft.y * h).rot(shape.rotation)

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
function getContainerStyle(shape: TLImageShape) {
	const crop = shape.props.crop
	const topLeft = crop?.topLeft
	if (!topLeft) return

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
