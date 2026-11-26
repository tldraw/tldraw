// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { mergeArraysAndReplaceDefaults } from '@tldraw/utils'
import type { TLAnyBindingUtilConstructor } from '../config/defaultBindings'
import type { TLAnyShapeUtilConstructor } from '../config/defaultShapes'
import type { TLStateNodeConstructor } from '../editor/tools/StateNode'
import type { TLPlugin } from './plugin'

/**
 * The shape utils, binding utils and tools that an editor gets from its plugins and its options.
 *
 * @internal
 */
export interface TLEditorRecords {
	shapeUtils: readonly TLAnyShapeUtilConstructor[]
	bindingUtils: readonly TLAnyBindingUtilConstructor[]
	tools: readonly TLStateNodeConstructor[]
}

/**
 * Combine the records that plugins declare with the records that the editor options give. An
 * option replaces a plugin record of the same shape type, binding type or tool id, so
 * `shapeUtils: [MyGeoShapeUtil]` replaces the geo shape util of the geo plugin and keeps its tool.
 * Plugin records come first, in plugin order, then the options. Two plugins that declare the same
 * type are not combined here: the editor throws for them.
 *
 * @internal
 */
export function resolvePluginRecords(
	plugins: readonly TLPlugin[],
	options: Partial<TLEditorRecords>
): TLEditorRecords {
	return {
		shapeUtils: mergeArraysAndReplaceDefaults(
			'type',
			options.shapeUtils ?? [],
			plugins.flatMap((p) => p.shapeUtils ?? [])
		),
		bindingUtils: mergeArraysAndReplaceDefaults(
			'type',
			options.bindingUtils ?? [],
			plugins.flatMap((p) => p.bindingUtils ?? [])
		),
		tools: mergeArraysAndReplaceDefaults(
			'id',
			options.tools ?? [],
			plugins.flatMap((p) => p.tools ?? [])
		),
	}
}
