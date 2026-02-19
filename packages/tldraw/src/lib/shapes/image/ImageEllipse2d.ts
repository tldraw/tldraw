import { Ellipse2d, Geometry2dOptions, VecLike } from '@tldraw/editor'
import { ImageAlphaGeometryConfig, isImagePointTransparent } from './ImageAlphaCache'

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
		this.alphaConfig = {
			alphaDataGetter: config.alphaDataGetter,
			crop: config.crop,
			flipX: config.flipX,
			flipY: config.flipY,
		}
	}

	override hitTestPoint(point: VecLike, margin = 0, hitInside = false): boolean {
		if (!super.hitTestPoint(point, margin, hitInside)) return false
		return !isImagePointTransparent(this.alphaConfig, point, this.bounds)
	}

	override ignoreHit(point: VecLike): boolean {
		return isImagePointTransparent(this.alphaConfig, point, this.bounds)
	}
}
