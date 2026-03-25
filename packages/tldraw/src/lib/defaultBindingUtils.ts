import { ArrowBindingUtil } from './bindings/arrow/ArrowBindingUtil'
import { StickerBindingUtil } from './bindings/sticker/StickerBindingUtil'

/** @public */
export const defaultBindingUtils = [ArrowBindingUtil, StickerBindingUtil] as const
