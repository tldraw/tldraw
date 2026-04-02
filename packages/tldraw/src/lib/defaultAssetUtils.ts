import { AudioAssetUtil } from './assets/AudioAssetUtil'
import { BookmarkAssetUtil } from './assets/BookmarkAssetUtil'
import { ImageAssetUtil } from './assets/ImageAssetUtil'
import { VideoAssetUtil } from './assets/VideoAssetUtil'

/** @public */
export const defaultAssetUtils = [
	AudioAssetUtil,
	ImageAssetUtil,
	VideoAssetUtil,
	BookmarkAssetUtil,
] as const
