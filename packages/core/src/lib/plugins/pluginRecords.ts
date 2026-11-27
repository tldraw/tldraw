// This module is part of the headless core. It must not import React or touch the DOM.
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
 * type or id throw.
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
			uniquePluginRecords(plugins, 'shapeUtils', 'type', 'Shape type')
		),
		bindingUtils: mergeArraysAndReplaceDefaults(
			'type',
			options.bindingUtils ?? [],
			uniquePluginRecords(plugins, 'bindingUtils', 'type', 'Binding type')
		),
		tools: mergeArraysAndReplaceDefaults(
			'id',
			options.tools ?? [],
			uniquePluginRecords(plugins, 'tools', 'id', 'Tool id')
		),
	}
}

// An option replaces every plugin record of its type, so a conflict between two plugins must be
// caught here: after the merge, an option would hide it.
function uniquePluginRecords<K extends 'shapeUtils' | 'bindingUtils' | 'tools'>(
	plugins: readonly TLPlugin[],
	kind: K,
	key: 'type' | 'id',
	label: string
): NonNullable<TLPlugin[K]>[number][] {
	const owners = new Map<string, string>()
	const records: NonNullable<TLPlugin[K]>[number][] = []
	for (const plugin of plugins) {
		for (const record of plugin[kind] ?? []) {
			const name = (record as unknown as Record<string, string>)[key]
			const owner = owners.get(name)
			if (owner !== undefined) {
				throw Error(
					`${label} "${name}" is declared by both plugin "${owner}" and plugin "${plugin.id}"`
				)
			}
			owners.set(name, plugin.id)
			records.push(record)
		}
	}
	return records
}
