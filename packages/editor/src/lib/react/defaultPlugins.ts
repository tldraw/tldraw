import { animationFrameTickPlugin } from '@tldraw/core'
import { domFocusPlugin } from '@tldraw/core'
import { domImageExportPlugin } from '@tldraw/core'
import { domTextMeasurementPlugin } from '@tldraw/core'
import { domFontsPlugin } from '@tldraw/core'
import { createCorePlugins } from '@tldraw/core'
import type { TLPlugin } from '@tldraw/core'
import { reactRenderingPlugins } from './reactRenderingPlugins'

/**
 * Create the plugins that `new Editor()` and `<TldrawEditor>` install when you pass no `plugins`.
 * They are the core plugins from {@link @tldraw/core#createCorePlugins}, plus the browser and React layer: a
 * frame loop, DOM text measurement, focus and fonts, image export, and React rendering and SVG
 * export. A package can add to them with `registerDefaultPlugins`: the `tldraw` entry adds its shape
 * views.
 *
 * To add plugins, spread the defaults into your own list. To replace one, filter it out:
 *
 * @example
 * ```ts
 * new Editor({ ...opts, plugins: [...createDefaultPlugins(), myPlugin] })
 * new Editor({
 *   ...opts,
 *   plugins: [
 *     ...createDefaultPlugins().filter((p) => p.id !== 'domTextMeasurement'),
 *     approximateTextMeasurementPlugin(),
 *   ],
 * })
 * ```
 *
 * @public
 */
export function createDefaultPlugins(): TLPlugin[] {
	return [
		...createCorePlugins(),
		animationFrameTickPlugin,
		domTextMeasurementPlugin,
		domFocusPlugin,
		domFontsPlugin,
		domImageExportPlugin,
		...reactRenderingPlugins,
		...registeredDefaultPlugins,
	]
}

// Plugins that another package adds to the defaults. The `tldraw` entry adds the views of its
// default shapes here, so that an editor built from `shapeUtils` alone, without the tldraw
// plugins, still draws them. This is a provisional seam, like `setDefaultEditorPlugins`.
const registeredDefaultPlugins: TLPlugin[] = []

/** @internal */
export function registerDefaultPlugins(plugins: readonly TLPlugin[]) {
	for (const plugin of plugins) {
		if (registeredDefaultPlugins.some((p) => p.id === plugin.id)) continue
		registeredDefaultPlugins.push(plugin)
	}
}
