import { animationFrameTickPlugin } from '../plugins/builtin/animationFrameTick'
import { domFocusPlugin } from '../plugins/builtin/domFocus'
import { domImageExportPlugin } from '../plugins/builtin/domImageExport'
import { domTextMeasurementPlugin } from '../plugins/builtin/domTextMeasurement'
import { externalContentPlugin } from '../plugins/builtin/externalContent'
import { snappingPlugin } from '../plugins/builtin/snappingPlugin'
import type { TLPlugin } from '../plugins/plugin'
import { reactRenderingPlugins } from './reactRenderingPlugins'

/**
 * Create the plugins that `new Editor()` and `<TldrawEditor>` install when you pass no `plugins`.
 * They give the editor its standard behavior: a browser frame loop, DOM text measurement and
 * focus, snapping, external content, image export, and React rendering and SVG export.
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
		animationFrameTickPlugin,
		domTextMeasurementPlugin,
		domFocusPlugin,
		snappingPlugin,
		externalContentPlugin,
		domImageExportPlugin,
		...reactRenderingPlugins,
	]
}
