import { TLAnyBindingUtilConstructor } from '@tldraw/editor'
import { ArrowBindingUtil } from './bindings/arrow/ArrowBindingUtil'
import { TextBindingUtil } from './bindings/arrow/TextBindingUtil'

/** @public */
export const defaultBindingUtils: TLAnyBindingUtilConstructor[] = [
	ArrowBindingUtil,
	TextBindingUtil,
]
