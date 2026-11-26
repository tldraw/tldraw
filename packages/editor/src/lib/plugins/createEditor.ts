// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import type { TLStore } from '@tldraw/tlschema'
import { createTLStore } from '../config/createTLStore'
import { Editor, TLEditorOptions } from '../editor/Editor'
import type { TLPlugin } from './plugin'
import { resolvePluginRecords } from './pluginRecords'

/**
 * Options for {@link createEditor}.
 *
 * @public
 */
export interface TLCreateEditorOptions extends Omit<
	TLEditorOptions,
	'store' | 'shapeUtils' | 'bindingUtils' | 'tools' | 'plugins' | 'getContainer'
> {
	/** Everything that the editor can do beyond the core. Nothing else is installed. */
	plugins: readonly TLPlugin[]
	/**
	 * The store. If not given, the editor creates an empty store whose schema has the shape and
	 * binding utils of the plugins.
	 */
	store?: TLStore
	/**
	 * The DOM element that holds the editor. Leave it out for a headless editor. Plugins that need
	 * a container (such as DOM text measurement) throw when they set up without one.
	 */
	getContainer?(): HTMLElement
}

/**
 * Create an editor from a minimal core and a list of plugins.
 *
 * Unlike `new Editor()`, this installs no built-in plugins. The editor has only the behavior that
 * the plugins give it, so it runs without a DOM or React when the plugins need neither.
 *
 * @example
 * ```ts
 * const editor = createEditor({
 *   plugins: [shapesPlugin, approximateTextMeasurementPlugin(), snappingPlugin],
 * })
 * ```
 *
 * @public
 */
export function createEditor({
	plugins,
	store,
	getContainer,
	...rest
}: TLCreateEditorOptions): Editor {
	const records = resolvePluginRecords(plugins, {})
	return new Editor({
		...rest,
		store:
			store ??
			createTLStore({
				shapeUtils: records.shapeUtils,
				bindingUtils: records.bindingUtils,
			}),
		shapeUtils: [],
		bindingUtils: [],
		tools: [],
		plugins,
		getContainer:
			getContainer ??
			(() => {
				throw Error('This editor has no container. Pass `getContainer` to createEditor.')
			}),
	})
}
