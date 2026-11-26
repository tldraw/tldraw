import { exportToSvg } from '../exports/exportToSvg'
import { svgExportCapability } from '../plugins/builtin/svgExport'
import { TLPlugin, definePlugin } from '../plugins/plugin'
import { groupShapeViewPlugin } from './groupShapeView'

/**
 * Exports shapes to SVG by rendering them with React into a hidden DOM element.
 *
 * @public
 */
export const reactSvgExportPlugin = definePlugin({
	id: 'react.svgExport',
	provides: [svgExportCapability],
	setup(ctx) {
		ctx.provide(svgExportCapability, {
			exportToSvg: (shapeIds, opts) => exportToSvg(ctx.editor, shapeIds, opts),
		})
	},
})

/**
 * The plugins that make up the React output layer: the group shape view and SVG export.
 *
 * @public
 */
export const reactRenderingPlugins: readonly TLPlugin[] = [
	groupShapeViewPlugin,
	reactSvgExportPlugin,
]
