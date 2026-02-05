import { ArrowBindingUtil } from './bindings/arrow/ArrowBindingUtil'
import { StickyBindingUtil } from './bindings/sticky/StickyBindingUtil'

/** @public */
export const defaultBindingUtils = [ArrowBindingUtil, StickyBindingUtil] as const
