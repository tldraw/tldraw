import {
	AssetUtil,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	MediaHelpers,
	TLAssetId,
	TLShapePartial,
	TLVideoAsset,
	VecLike,
	createShapeId,
	getHashForBuffer,
	videoAssetMigrations,
	videoAssetProps,
} from '@tldraw/editor'

/** @public */
export class VideoAssetUtil extends AssetUtil<TLVideoAsset> {
	static override type = 'video' as const
	static override props = videoAssetProps
	static override migrations = videoAssetMigrations

	override getDefaultProps(): TLVideoAsset['props'] {
		return {
			w: 0,
			h: 0,
			name: '',
			isAnimated: true,
			mimeType: null,
			src: null,
		}
	}

	override getSupportedMimeTypes(): readonly string[] {
		return DEFAULT_SUPPORT_VIDEO_TYPES
	}

	override async getAssetFromFile(file: File, assetId: TLAssetId): Promise<TLVideoAsset | null> {
		const hash = getHashForBuffer(await file.arrayBuffer())
		const id = assetId ?? (`asset:${hash}` as TLAssetId)

		let fileType = file.type
		if (fileType === 'video/quicktime') {
			// hack to make .mov videos work
			fileType = 'video/mp4'
		}

		const size = await MediaHelpers.getVideoSize(file)

		return {
			id,
			type: 'video',
			typeName: 'asset',
			props: {
				name: file.name,
				src: '',
				w: size.w,
				h: size.h,
				fileSize: file.size,
				mimeType: fileType,
				isAnimated: true,
			},
			meta: {},
		}
	}

	override createShape(asset: TLVideoAsset, position: VecLike): TLShapePartial | null {
		return {
			id: createShapeId(),
			type: 'video',
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
