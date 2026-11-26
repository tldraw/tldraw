import { TLPlugin, registerDefaultPlugins } from '@tldraw/editor'
import { highlightShapeViewPlugin } from './shapes/highlight/HighlightShapeView'

/**
 * The plugins with the React views of the default shapes. The shape utils in
 * {@link defaultShapeUtils} have no React, and these views draw them.
 *
 * Importing `tldraw` adds them to {@link @tldraw/editor#createDefaultPlugins}, so every editor
 * draws the default shapes, including one built from `shapeUtils={defaultShapeUtils}` without
 * the tldraw plugins.
 *
 * @public
 */
export const defaultShapeViewPlugins: readonly TLPlugin[] = [highlightShapeViewPlugin]

registerDefaultPlugins(defaultShapeViewPlugins)
