import { animationFrameTickPlugin } from '../plugins/builtin/animationFrameTick'
import { domFocusPlugin } from '../plugins/builtin/domFocus'
import { domImageExportPlugin } from '../plugins/builtin/domImageExport'
import { domTextMeasurementPlugin } from '../plugins/builtin/domTextMeasurement'
import { domFontsPlugin } from '../plugins/builtin/fonts'
import { createKernelPlugins } from '../plugins/kernelPlugins'
import type { TLPlugin } from '../plugins/plugin'
import { reactRenderingPlugins } from './reactRenderingPlugins'

/**
 * Create the plugins that `new Editor()` and `<TldrawEditor>` install when you pass no `plugins`.
 * They are the kernel plugins from {@link createKernelPlugins}, plus the browser and React layer: a
 * frame loop, DOM text measurement, focus and fonts, image export, and React rendering and SVG
 * export.
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
		...createKernelPlugins(),
		animationFrameTickPlugin,
		domTextMeasurementPlugin,
		domFocusPlugin,
		domFontsPlugin,
		domImageExportPlugin,
		...reactRenderingPlugins,
	]
}
