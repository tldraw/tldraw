import {
	AssetUtil,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	MediaHelpers,
	TLAssetId,
	TLImageAsset,
	imageAssetMigrations,
	imageAssetProps,
} from '@tldraw/editor'
import { DEFAULT_MAX_IMAGE_DIMENSION } from '../defaultExternalContentHandlers'
import { containBoxSize } from '../utils/assets/assets'

/** @public */
export class ImageAssetUtil extends AssetUtil<TLImageAsset> {
	static override type = 'image' as const
	static override props = imageAssetProps
	static override migrations = imageAssetMigrations

	override options: {
		maxDimension: number
		supportedMimeTypes: readonly string[] | null
	} = {
		maxDimension: DEFAULT_MAX_IMAGE_DIMENSION,
		supportedMimeTypes: null,
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
		return this.options.supportedMimeTypes ?? DEFAULT_SUPPORTED_IMAGE_TYPES
	}

	override async getAssetFromFile(file: File, assetId: TLAssetId): Promise<TLImageAsset | null> {
		const doc = this.editor.getContainerDocument()
		const size = await MediaHelpers.getImageSize(file, doc)
		const isAnimated = await MediaHelpers.isAnimated(file)
		const pixelRatio = 'pixelRatio' in size && size.pixelRatio !== 1 ? size.pixelRatio : undefined

		const assetInfo: TLImageAsset = {
			id: assetId,
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
				...(pixelRatio ? { pixelRatio } : undefined),
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
}
