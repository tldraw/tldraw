// oxlint-disable typescript/no-empty-object-type
import {
	BaseBoxShapeUtil,
	createShapeId,
	defineMessages,
	Ellipse2d,
	Geometry2d,
	imageShapeMigrations,
	imageShapeProps,
	lerp,
	Rectangle2d,
	resizeBox,
	structuredClone,
	SvgExportContext,
	TLAsset,
	TLImageAsset,
	TLImageShape,
	TLImageShapeProps,
	TLResizeInfo,
	TLShapePartial,
	translateMessage,
	Vec,
	VecModel,
} from '@tldraw/editor'
import { getUncroppedSize } from '../shared/crop'
import { getFlipForResize } from '../shared/flip'
import type { ShapeOptionsWithDisplayValues } from '../shared/getDisplayValues'
import { TRANSPARENT_IMAGE_MIMETYPES, getAlphaData } from './ImageAlphaCache'
import { ImageEllipse2d, ImageRectangle2d } from './ImageAlphaGeometry'

/** @public */
export interface ImageShapeUtilDisplayValues {}

/** @public */
export interface ImageShapeOptions extends ShapeOptionsWithDisplayValues<
	TLImageShape,
	ImageShapeUtilDisplayValues
> {}

const messages = defineMessages({
	name: { id: 'a11y.shape-image', defaultMessage: 'Image' },
})

/** @public */
export class ImageShapeUtil extends BaseBoxShapeUtil<TLImageShape> {
	static override type = 'image' as const
	static override props = imageShapeProps
	static override migrations = imageShapeMigrations
	static override handledAssetTypes = ['image'] as const

	override options: ImageShapeOptions = {
		getDefaultDisplayValues(): ImageShapeUtilDisplayValues {
			return {}
		},
		getCustomDisplayValues(): Partial<ImageShapeUtilDisplayValues> {
			return {}
		},
	}

	override getShapeName() {
		return translateMessage(this.editor.i18n(), messages.name)
	}

	override isAspectRatioLocked(shape: TLImageShape) {
		return true
	}
	override canCrop(shape: TLImageShape) {
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

	override createShapeForAsset(asset: TLAsset, position: VecModel): TLShapePartial | null {
		const imageAsset = asset as TLImageAsset
		return {
			id: createShapeId(),
			type: 'image',
			x: position.x,
			y: position.y,
			opacity: 1,
			props: {
				assetId: imageAsset.id,
				w: imageAsset.props.w,
				h: imageAsset.props.h,
			},
		}
	}

	override getGeometry(shape: TLImageShape): Geometry2d {
		const asset = shape.props.assetId ? this.editor.getAsset(shape.props.assetId) : null
		const mimeType = asset && 'mimeType' in asset.props ? asset.props.mimeType : null
		const supportsTransparency = mimeType != null && TRANSPARENT_IMAGE_MIMETYPES.includes(mimeType)
		const assetSrc = asset && 'src' in asset.props ? asset.props.src : null

		if (shape.props.crop?.isCircle) {
			if (supportsTransparency && assetSrc) {
				const src = assetSrc
				return new ImageEllipse2d({
					width: shape.props.w,
					height: shape.props.h,
					isFilled: true,
					alphaDataGetter: () => getAlphaData(src),
					crop: shape.props.crop,
					flipX: shape.props.flipX,
					flipY: shape.props.flipY,
				})
			}
			return new Ellipse2d({
				width: shape.props.w,
				height: shape.props.h,
				isFilled: true,
			})
		}

		if (supportsTransparency && assetSrc) {
			const src = assetSrc
			return new ImageRectangle2d({
				width: shape.props.w,
				height: shape.props.h,
				isFilled: true,
				alphaDataGetter: () => getAlphaData(src),
				crop: shape.props.crop,
				flipX: shape.props.flipX,
				flipY: shape.props.flipY,
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

	override canFlip() {
		return true
	}

	override onResize(shape: TLImageShape, info: TLResizeInfo<TLImageShape>) {
		let resized: TLImageShape = resizeBox(shape, info)
		const { scaleX, scaleY } = info

		resized = {
			...resized,
			props: {
				...resized.props,
				...getFlipForResize(info.initialShape.props, info),
			},
		}
		if (!shape.props.crop) return resized

		// Mirror the crop whenever the shape is flipped along an axis. This happens both when
		// using the flip command and when dragging a resize handle (including a group's handle)
		// past the opposite edge. We can't check for an exact scale of -1 here because a group
		// flip resizes its children by an arbitrary negative scale, not just -1.
		const flipCropHorizontally = scaleX < 0
		const flipCropVertically = scaleY < 0

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

	// The React view draws the shape, see `imageShapeView`. These methods call it so that a
	// subclass can override them or call `super`.
	component(shape: TLImageShape) {
		return this.getView()?.component(shape, this) ?? null
	}

	override getIndicatorPath(shape: TLImageShape): Path2D | undefined {
		if (this.editor.getCroppingShapeId() === shape.id) return undefined

		const path = new Path2D()
		if (shape.props.crop?.isCircle) {
			const cx = shape.props.w / 2
			const cy = shape.props.h / 2
			path.ellipse(cx, cy, cx, cy, 0, 0, Math.PI * 2)
		} else {
			path.rect(0, 0, shape.props.w, shape.props.h)
		}
		return path
	}

	override async toSvg(shape: TLImageShape, ctx: SvgExportContext) {
		return (await this.getView()?.toSvg?.(shape, ctx, this)) ?? null
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
