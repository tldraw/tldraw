import { TLAnyBindingUtilConstructor } from '@tldraw/editor'
import { ArrowBindingUtil } from './bindings/arrow/ArrowBindingUtil'

/** @public */
export const defaultBindingUtils = [
	ArrowBindingUtil,
] as const satisfies TLAnyBindingUtilConstructor[]
