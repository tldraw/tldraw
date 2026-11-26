import { TLPlugin, createDefaultPlugins, definePlugin } from '@tldraw/editor'
import { ArrowBindingUtil } from './bindings/arrow/ArrowBindingUtil'
import { ArrowShapeTool } from './shapes/arrow/ArrowShapeTool'
import { ArrowShapeUtil } from './shapes/arrow/ArrowShapeUtil'
import { BookmarkShapeUtil } from './shapes/bookmark/BookmarkShapeUtil'
import { DrawShapeTool } from './shapes/draw/DrawShapeTool'
import { DrawShapeUtil } from './shapes/draw/DrawShapeUtil'
import { EmbedShapeUtil } from './shapes/embed/EmbedShapeUtil'
import { FrameShapeTool } from './shapes/frame/FrameShapeTool'
import { FrameShapeUtil } from './shapes/frame/FrameShapeUtil'
import { GeoShapeTool } from './shapes/geo/GeoShapeTool'
import { GeoShapeUtil } from './shapes/geo/GeoShapeUtil'
import { HighlightShapeTool } from './shapes/highlight/HighlightShapeTool'
import { HighlightShapeUtil } from './shapes/highlight/HighlightShapeUtil'
import { ImageShapeUtil } from './shapes/image/ImageShapeUtil'
import { LineShapeTool } from './shapes/line/LineShapeTool'
import { LineShapeUtil } from './shapes/line/LineShapeUtil'
import { NoteShapeTool } from './shapes/note/NoteShapeTool'
import { NoteShapeUtil } from './shapes/note/NoteShapeUtil'
import { TextShapeTool } from './shapes/text/TextShapeTool'
import { TextShapeUtil } from './shapes/text/TextShapeUtil'
import { VideoShapeUtil } from './shapes/video/VideoShapeUtil'
import { EraserTool } from './tools/EraserTool/EraserTool'
import { HandTool } from './tools/HandTool/HandTool'
import { LaserTool } from './tools/LaserTool/LaserTool'
import { SelectTool } from './tools/SelectTool/SelectTool'
import { ZoomTool } from './tools/ZoomTool/ZoomTool'

/**
 * One plugin for each default shape. Each plugin declares the shape util, the tool that creates
 * the shape, and the bindings that the shape owns. The arrow plugin declares the arrow binding.
 *
 * The plugin ids are the shape type followed by `Shape`, for example `geoShape`. To remove a shape
 * from `<Tldraw>`, filter its plugin out of {@link createTldrawPlugins}. To change a shape, pass
 * your shape util in `shapeUtils`: it replaces the plugin's util of the same type and keeps the
 * plugin's tool.
 *
 * @public
 */
export const defaultShapePlugins: readonly TLPlugin[] = [
	definePlugin({ id: 'textShape', shapeUtils: [TextShapeUtil], tools: [TextShapeTool] }),
	definePlugin({ id: 'bookmarkShape', shapeUtils: [BookmarkShapeUtil] }),
	definePlugin({ id: 'drawShape', shapeUtils: [DrawShapeUtil], tools: [DrawShapeTool] }),
	definePlugin({ id: 'geoShape', shapeUtils: [GeoShapeUtil], tools: [GeoShapeTool] }),
	definePlugin({ id: 'noteShape', shapeUtils: [NoteShapeUtil], tools: [NoteShapeTool] }),
	definePlugin({ id: 'lineShape', shapeUtils: [LineShapeUtil], tools: [LineShapeTool] }),
	definePlugin({ id: 'frameShape', shapeUtils: [FrameShapeUtil], tools: [FrameShapeTool] }),
	definePlugin({
		id: 'arrowShape',
		shapeUtils: [ArrowShapeUtil],
		bindingUtils: [ArrowBindingUtil],
		tools: [ArrowShapeTool],
	}),
	definePlugin({
		id: 'highlightShape',
		shapeUtils: [HighlightShapeUtil],
		tools: [HighlightShapeTool],
	}),
	definePlugin({ id: 'embedShape', shapeUtils: [EmbedShapeUtil] }),
	definePlugin({ id: 'imageShape', shapeUtils: [ImageShapeUtil] }),
	definePlugin({ id: 'videoShape', shapeUtils: [VideoShapeUtil] }),
]

/**
 * One plugin for each default tool that does not create a shape. The plugin ids are the tool id
 * followed by `Tool`, for example `eraserTool`.
 *
 * @public
 */
export const defaultToolPlugins: readonly TLPlugin[] = [
	definePlugin({ id: 'eraserTool', tools: [EraserTool] }),
	definePlugin({ id: 'handTool', tools: [HandTool] }),
	definePlugin({ id: 'laserTool', tools: [LaserTool] }),
	definePlugin({ id: 'zoomTool', tools: [ZoomTool] }),
	definePlugin({ id: 'selectTool', tools: [SelectTool] }),
]

/**
 * The plugins that `<Tldraw>` installs when you do not pass `plugins`: the editor's
 * {@link @tldraw/editor#createDefaultPlugins}, then {@link defaultToolPlugins} and
 * {@link defaultShapePlugins}. The `plugins` prop is the complete list, so spread this to add
 * your own plugins, and filter it by id to remove one.
 *
 * @example
 * ```tsx
 * <Tldraw plugins={[...createTldrawPlugins().filter((p) => p.id !== 'videoShape'), myPlugin]} />
 * ```
 *
 * @public
 */
export function createTldrawPlugins(): TLPlugin[] {
	return [...createDefaultPlugins(), ...defaultToolPlugins, ...defaultShapePlugins]
}
