import { Geometry2dOptions, Rectangle2d, VecLike } from '@tldraw/editor'
import { AlphaData, isPointTransparent } from './ImageAlphaCache'

/** @internal */
export class ImageRectangle2d extends Rectangle2d {
	private alphaDataGetter: () => AlphaData | null
	private crop: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } } | null
	private flipX: boolean
	private flipY: boolean

	constructor(
		config: Omit<Geometry2dOptions, 'isClosed'> & {
			x?: number
			y?: number
			width: number
			height: number
			alphaDataGetter(): AlphaData | null
			crop: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } } | null
			flipX: boolean
			flipY: boolean
		}
	) {
		super(config)
		this.alphaDataGetter = config.alphaDataGetter
		this.crop = config.crop
		this.flipX = config.flipX
		this.flipY = config.flipY
	}

	/** Map a point in shape space to normalized [0,1] image coordinates, accounting for crop and flip. */
	private mapToImageCoords(point: VecLike): { nx: number; ny: number } {
		const { bounds } = this

		// Normalize point to [0,1] within the shape bounds, clamped for edge-margin hits
		let nx = Math.max(0, Math.min(1, (point.x - bounds.minX) / bounds.w))
		let ny = Math.max(0, Math.min(1, (point.y - bounds.minY) / bounds.h))

		// Map from cropped shape space to full image space
		if (this.crop) {
			const { topLeft, bottomRight } = this.crop
			nx = topLeft.x + nx * (bottomRight.x - topLeft.x)
			ny = topLeft.y + ny * (bottomRight.y - topLeft.y)
		}

		// Account for flips
		if (this.flipX) nx = 1 - nx
		if (this.flipY) ny = 1 - ny

		return { nx, ny }
	}

	override hitTestPoint(point: VecLike, margin = 0, hitInside = false): boolean {
		if (!super.hitTestPoint(point, margin, hitInside)) return false

		const data = this.alphaDataGetter()
		if (!data) return true

		const { nx, ny } = this.mapToImageCoords(point)
		return !isPointTransparent(data, nx, ny)
	}

	override rejectHit(point: VecLike): boolean {
		const data = this.alphaDataGetter()
		if (!data) return false

		const { nx, ny } = this.mapToImageCoords(point)
		return isPointTransparent(data, nx, ny)
	}
}
