import {
	AssetUtil,
	DEFAULT_SUPPORT_AUDIO_TYPES,
	MediaHelpers,
	TLAssetId,
	TLAudioAsset,
	TLShapePartial,
	VecLike,
	audioAssetMigrations,
	audioAssetProps,
	createShapeId,
} from '@tldraw/editor'
import { AUDIO_HEIGHT, AUDIO_WIDTH } from '../shapes/audio/AudioShapeUtil'

/** @public */
export class AudioAssetUtil extends AssetUtil<TLAudioAsset> {
	static override type = 'audio' as const
	static override props = audioAssetProps
	static override migrations = audioAssetMigrations

	override options: {
		supportedMimeTypes: readonly string[] | null
	} = {
		supportedMimeTypes: null,
	}

	override getDefaultProps(): TLAudioAsset['props'] {
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
		return this.options.supportedMimeTypes ?? DEFAULT_SUPPORT_AUDIO_TYPES
	}

	override async getAssetFromFile(file: File, assetId: TLAssetId): Promise<TLAudioAsset | null> {
		const { title, coverArt } = await MediaHelpers.getAudioTags(file)

		return {
			id: assetId,
			type: 'audio',
			typeName: 'asset',
			props: {
				name: file.name,
				src: '',
				w: AUDIO_WIDTH,
				h: AUDIO_HEIGHT,
				fileSize: file.size,
				mimeType: file.type,
				isAnimated: false,
				title: title || undefined,
				coverArt: coverArt || undefined,
			},
			meta: {},
		}
	}

	override createShape(asset: TLAudioAsset, position: VecLike): TLShapePartial | null {
		return {
			id: createShapeId(),
			type: 'audio',
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
