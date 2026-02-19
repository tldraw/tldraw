import {
	AssetUtil,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	MediaHelpers,
	TLAssetId,
	TLImageAsset,
	TLShapePartial,
	VecLike,
	createShapeId,
	getHashForBuffer,
	imageAssetMigrations,
	imageAssetProps,
} from '@tldraw/editor'
import { containBoxSize } from '../utils/assets/assets'

/** @public */
export class ImageAssetUtil extends AssetUtil<TLImageAsset> {
	static override type = 'image' as const
	static override props = imageAssetProps
	static override migrations = imageAssetMigrations

	override options = {
		maxDimension: 5000,
	}

	override getDefaultProps(): TLImageAsset['props'] {
		return {
			w: 0,
			h: 0,
			name: '',
			isAnimated: false,
			mimeType: null,
			src: null,
		}
	}

	override getSupportedMimeTypes(): readonly string[] {
		return DEFAULT_SUPPORTED_IMAGE_TYPES
	}

	override async getAssetFromFile(file: File, assetId: TLAssetId): Promise<TLImageAsset | null> {
		const hash = getHashForBuffer(await file.arrayBuffer())
		const id = assetId ?? (`asset:${hash}` as TLAssetId)

		const size = await MediaHelpers.getImageSize(file)
		const isAnimated = await MediaHelpers.isAnimated(file)

		const assetInfo: TLImageAsset = {
			id,
			type: 'image',
			typeName: 'asset',
			props: {
				name: file.name,
				src: '',
				w: size.w,
				h: size.h,
				fileSize: file.size,
				mimeType: file.type,
				isAnimated,
			},
			meta: {},
		}

		const maxDimension = this.options.maxDimension
		if (maxDimension && isFinite(maxDimension)) {
			const originalSize = { w: assetInfo.props.w, h: assetInfo.props.h }
			const resizedSize = containBoxSize(originalSize, { w: maxDimension, h: maxDimension })
			if (originalSize !== resizedSize && MediaHelpers.isStaticImageType(file.type)) {
				assetInfo.props.w = resizedSize.w
				assetInfo.props.h = resizedSize.h
			}
		}

		return assetInfo
	}

	override createShape(asset: TLImageAsset, position: VecLike): TLShapePartial | null {
		return {
			id: createShapeId(),
			type: 'image',
			x: position.x,
			y: position.y,
			opacity: 1,
			props: {
				assetId: asset.id,
				w: asset.props.w,
				h: asset.props.h,
			},
		}
	}
}
