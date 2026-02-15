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

	override rejectHit(point: VecLike): boolean {
		const data = this.alphaDataGetter()
		if (!data) return false

		const { bounds } = this

		// Normalize point to [0,1] within the shape bounds
		let nx = (point.x - bounds.minX) / bounds.w
		let ny = (point.y - bounds.minY) / bounds.h

		// Map from cropped shape space to full image space
		if (this.crop) {
			const { topLeft, bottomRight } = this.crop
			nx = topLeft.x + nx * (bottomRight.x - topLeft.x)
			ny = topLeft.y + ny * (bottomRight.y - topLeft.y)
		}

		// Account for flips
		if (this.flipX) nx = 1 - nx
		if (this.flipY) ny = 1 - ny

		return isPointTransparent(data, nx, ny)
	}
}
