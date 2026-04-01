import {
	AssetUtil,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	MediaHelpers,
	TLAssetId,
	TLVideoAsset,
	videoAssetMigrations,
	videoAssetProps,
} from '@tldraw/editor'

/** @public */
export class VideoAssetUtil extends AssetUtil<TLVideoAsset> {
	static override type = 'video' as const
	static override props = videoAssetProps
	static override migrations = videoAssetMigrations

	override options: {
		supportedMimeTypes: readonly string[] | null
	} = {
		supportedMimeTypes: null,
	}

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
		return this.options.supportedMimeTypes ?? DEFAULT_SUPPORT_VIDEO_TYPES
	}

	override async getAssetFromFile(file: File, assetId: TLAssetId): Promise<TLVideoAsset | null> {
		let fileType = file.type
		if (fileType === 'video/quicktime') {
			// hack to make .mov videos work
			fileType = 'video/mp4'
		}

		const doc = this.editor.getContainerDocument()
		const size = await MediaHelpers.getVideoSize(file, doc)

		return {
			id: assetId,
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
}
