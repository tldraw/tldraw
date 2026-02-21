import { BookmarkAssetUtil } from './assets/BookmarkAssetUtil'
import { ImageAssetUtil } from './assets/ImageAssetUtil'
import { VideoAssetUtil } from './assets/VideoAssetUtil'

/** @public */
export const defaultAssetUtils = [ImageAssetUtil, VideoAssetUtil, BookmarkAssetUtil] as const
