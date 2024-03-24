import {
	Rectangle2d,
	ShapeUtil,
	TLOnResizeHandler,
	TLStickerShape,
	Vec,
	stickerShapeMigrations,
	stickerShapeProps,
} from '@tldraw/editor'
import { useAssetUrls } from '../../ui/context/asset-urls'
import { TLCanonicalStickerType } from '../../ui/sticker-types'

export const INITIAL_STICKER_SIZE = 48

/** @public */
export class StickerShapeUtil extends ShapeUtil<TLStickerShape> {
	static override type = 'sticker' as const
	static override props = stickerShapeProps
	static override migrations = stickerShapeMigrations

	// override hideResizeHandles = () => true
	// override hideSelectionBoundsFg = () => true
	override isAlwaysOnTop = () => true

	getDefaultProps(): TLStickerShape['props'] {
		return {
			w: INITIAL_STICKER_SIZE,
			h: INITIAL_STICKER_SIZE,
			kind: 'canonical',
			sticker: 'heart',
			url: '',
		}
	}

	getGeometry(shape: TLStickerShape) {
		const size = Math.max(1, this.getSize(shape) as number)
		return new Rectangle2d({ width: size, height: size, isFilled: true })
	}

	getSize(shape: TLStickerShape) {
		// TODO: This fallback is only for old notes as I experiment for now.
		return Math.max(1, (shape.props.w as number) || INITIAL_STICKER_SIZE)
	}

	component(shape: TLStickerShape) {
		const {
			props: { kind, sticker, url },
		} = shape

		return (
			<>
				<div
					style={{
						position: 'absolute',
						width: this.getSize(shape),
						height: this.getSize(shape),
					}}
				>
					{kind === 'canonical' ? (
						<CanonicalSticker sticker={sticker} size={this.getSize(shape)} />
					) : (
						<img
							src={url}
							alt="custom sticker"
							style={{
								width: this.getSize(shape),
								height: this.getSize(shape),
							}}
						/>
					)}
				</div>
			</>
		)
	}

	indicator() {
		return null
	}

	override onResize: TLOnResizeHandler<TLStickerShape> = (
		shape,
		{ newPoint, scaleX, scaleY, initialShape }
	) => {
		// use the w/h from props here instead of the initialBounds here,
		// since cloud shapes calculated bounds can differ from the props w/h.
		const w = initialShape.props.w * scaleX
		// const h = initialShape.props.h * scaleX

		const offset = new Vec(0, 0)

		// x offsets

		if (scaleX < 0) {
			offset.x += w
		}
		if (scaleY < 0) {
			offset.y += w
		}

		const { x, y } = offset.rot(shape.rotation).add(newPoint)

		return {
			x,
			y,
			props: {
				w: Math.max(Math.abs(w), 1),
				h: Math.max(Math.abs(w), 1),
			},
		}
	}

	override toSvg() {
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

		const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect1.setAttribute('rx', '10')
		rect1.setAttribute('width', INITIAL_STICKER_SIZE.toString())
		rect1.setAttribute('height', INITIAL_STICKER_SIZE.toString())
		rect1.setAttribute('stroke-width', '1')
		g.appendChild(rect1)

		return g
	}
}

function CanonicalSticker({ sticker, size }: { sticker?: string; size: number }) {
	const assetUrls = useAssetUrls()
	const asset = assetUrls.stickers[sticker as TLCanonicalStickerType]

	return (
		<img
			src={asset}
			alt={`sticker: ${sticker}`}
			style={{
				width: size,
				height: size,
			}}
		/>
	)
}
