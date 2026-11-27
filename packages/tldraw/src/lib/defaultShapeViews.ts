import { TLPlugin, registerDefaultPlugins } from '@tldraw/editor'
import { arrowShapeViewPlugin } from './shapes/arrow/ArrowShapeView'
import { bookmarkShapeViewPlugin } from './shapes/bookmark/BookmarkShapeView'
import { drawShapeViewPlugin } from './shapes/draw/DrawShapeView'
import { embedShapeViewPlugin } from './shapes/embed/EmbedShapeView'
import { frameShapeViewPlugin } from './shapes/frame/FrameShapeView'
import { geoShapeViewPlugin } from './shapes/geo/GeoShapeView'
import { highlightShapeViewPlugin } from './shapes/highlight/HighlightShapeView'
import { imageShapeViewPlugin } from './shapes/image/ImageShapeView'
import { lineShapeViewPlugin } from './shapes/line/LineShapeView'
import { noteShapeViewPlugin } from './shapes/note/NoteShapeView'
import { textShapeViewPlugin } from './shapes/text/TextShapeView'
import { videoShapeViewPlugin } from './shapes/video/VideoShapeView'

/**
 * The plugins with the React views of the default shapes. The shape utils in
 * {@link defaultShapeUtils} have no React, and these views draw them.
 *
 * Importing `tldraw` adds them to {@link @tldraw/editor#createDefaultPlugins}, so every editor
 * draws the default shapes, including one built from `shapeUtils={defaultShapeUtils}` without
 * the tldraw plugins. Do not add them to a list that already has `createDefaultPlugins()`: two
 * plugins with the same id throw.
 *
 * @public
 */
export const defaultShapeViewPlugins: readonly TLPlugin[] = [
	arrowShapeViewPlugin,
	bookmarkShapeViewPlugin,
	drawShapeViewPlugin,
	embedShapeViewPlugin,
	frameShapeViewPlugin,
	geoShapeViewPlugin,
	highlightShapeViewPlugin,
	imageShapeViewPlugin,
	lineShapeViewPlugin,
	noteShapeViewPlugin,
	textShapeViewPlugin,
	videoShapeViewPlugin,
]

registerDefaultPlugins(defaultShapeViewPlugins)
