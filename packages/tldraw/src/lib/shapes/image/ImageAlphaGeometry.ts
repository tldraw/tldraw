import { Ellipse2d, Geometry2dOptions, Rectangle2d, VecLike } from '@tldraw/editor'
import { ImageAlphaGeometryConfig, isImagePointTransparent } from './ImageAlphaCache'

function extractAlphaConfig(config: ImageAlphaGeometryConfig): ImageAlphaGeometryConfig {
	return {
		alphaDataGetter: config.alphaDataGetter,
		crop: config.crop,
		flipX: config.flipX,
		flipY: config.flipY,
	}
}

/** @internal */
export class ImageRectangle2d extends Rectangle2d {
	private alphaConfig: ImageAlphaGeometryConfig

	constructor(
		config: Omit<Geometry2dOptions, 'isClosed'> & {
			x?: number
			y?: number
			width: number
			height: number
		} & ImageAlphaGeometryConfig
	) {
		super(config)
		this.alphaConfig = extractAlphaConfig(config)
	}

	override hitTestPoint(point: VecLike, margin = 0, hitInside = false): boolean {
		if (!super.hitTestPoint(point, margin, hitInside)) return false
		return !isImagePointTransparent(this.alphaConfig, point, this.bounds)
	}

	override ignoreHit(point: VecLike): boolean {
		return isImagePointTransparent(this.alphaConfig, point, this.bounds)
	}
}

/** @internal */
export class ImageEllipse2d extends Ellipse2d {
	private alphaConfig: ImageAlphaGeometryConfig

	constructor(
		config: Omit<Geometry2dOptions, 'isClosed'> & {
			width: number
			height: number
		} & ImageAlphaGeometryConfig
	) {
		super(config)
		this.alphaConfig = extractAlphaConfig(config)
	}

	override hitTestPoint(point: VecLike, margin = 0, hitInside = false): boolean {
		if (!super.hitTestPoint(point, margin, hitInside)) return false
		return !isImagePointTransparent(this.alphaConfig, point, this.bounds)
	}

	override ignoreHit(point: VecLike): boolean {
		return isImagePointTransparent(this.alphaConfig, point, this.bounds)
	}
}
