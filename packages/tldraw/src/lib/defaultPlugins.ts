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
import './defaultShapeViews'
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
import {
	bookmarkActionItems,
	embedActionItems,
	frameActionItems,
	geoActionItems,
	imageActionItems,
	mediaActionItems,
	textActionItems,
	videoActionItems,
	zoomActionItems,
} from './ui/actionItems'
import {
	arrowToolItems,
	drawToolItems,
	embedToolItems,
	eraserToolItems,
	frameToolItems,
	geoToolItems,
	handToolItems,
	highlightToolItems,
	laserToolItems,
	lineToolItems,
	mediaToolItems,
	noteToolItems,
	selectToolItems,
	textToolItems,
} from './ui/toolItems'
import { uiActionItemsSlot, uiToolItemsSlot } from './ui/uiSlots'

/**
 * One plugin for each default shape. Each plugin declares the shape util, the tool that creates
 * the shape, the bindings that the shape owns, and the shape's tool items and actions in the UI.
 * The arrow plugin declares the arrow binding. The image plugin has the media item and the upload
 * action, which insert images and videos.
 *
 * The plugin ids are the shape type followed by `Shape`, for example `geoShape`. To change a
 * shape, pass your shape util in `shapeUtils`: it replaces the plugin's util of the same type and
 * keeps the plugin's tool. Without a plugin, `<Tldraw>` has no tool item, action or shortcut for
 * its shape, and pasted or dropped content of that shape is skipped.
 *
 * @public
 */
export const defaultShapePlugins: readonly TLPlugin[] = [
	definePlugin({
		id: 'textShape',
		shapeUtils: [TextShapeUtil],
		tools: [TextShapeTool],
		setup(ctx) {
			ctx.contribute(uiToolItemsSlot, textToolItems)
			ctx.contribute(uiActionItemsSlot, textActionItems)
		},
	}),
	definePlugin({
		id: 'bookmarkShape',
		shapeUtils: [BookmarkShapeUtil],
		setup: (ctx) => void ctx.contribute(uiActionItemsSlot, bookmarkActionItems),
	}),
	definePlugin({
		id: 'drawShape',
		shapeUtils: [DrawShapeUtil],
		tools: [DrawShapeTool],
		setup: (ctx) => void ctx.contribute(uiToolItemsSlot, drawToolItems),
	}),
	definePlugin({
		id: 'geoShape',
		shapeUtils: [GeoShapeUtil],
		tools: [GeoShapeTool],
		setup(ctx) {
			ctx.contribute(uiToolItemsSlot, geoToolItems)
			ctx.contribute(uiActionItemsSlot, geoActionItems)
		},
	}),
	definePlugin({
		id: 'noteShape',
		shapeUtils: [NoteShapeUtil],
		tools: [NoteShapeTool],
		setup: (ctx) => void ctx.contribute(uiToolItemsSlot, noteToolItems),
	}),
	definePlugin({
		id: 'lineShape',
		shapeUtils: [LineShapeUtil],
		tools: [LineShapeTool],
		setup: (ctx) => void ctx.contribute(uiToolItemsSlot, lineToolItems),
	}),
	definePlugin({
		id: 'frameShape',
		shapeUtils: [FrameShapeUtil],
		tools: [FrameShapeTool],
		setup(ctx) {
			ctx.contribute(uiToolItemsSlot, frameToolItems)
			ctx.contribute(uiActionItemsSlot, frameActionItems)
		},
	}),
	definePlugin({
		id: 'arrowShape',
		shapeUtils: [ArrowShapeUtil],
		bindingUtils: [ArrowBindingUtil],
		tools: [ArrowShapeTool],
		setup: (ctx) => void ctx.contribute(uiToolItemsSlot, arrowToolItems),
	}),
	definePlugin({
		id: 'highlightShape',
		shapeUtils: [HighlightShapeUtil],
		tools: [HighlightShapeTool],
		setup: (ctx) => void ctx.contribute(uiToolItemsSlot, highlightToolItems),
	}),
	definePlugin({
		id: 'embedShape',
		shapeUtils: [EmbedShapeUtil],
		setup(ctx) {
			ctx.contribute(uiToolItemsSlot, embedToolItems)
			ctx.contribute(uiActionItemsSlot, embedActionItems)
		},
	}),
	definePlugin({
		id: 'imageShape',
		shapeUtils: [ImageShapeUtil],
		setup(ctx) {
			ctx.contribute(uiToolItemsSlot, mediaToolItems)
			ctx.contribute(uiActionItemsSlot, imageActionItems)
			ctx.contribute(uiActionItemsSlot, mediaActionItems)
		},
	}),
	definePlugin({
		id: 'videoShape',
		shapeUtils: [VideoShapeUtil],
		setup: (ctx) => void ctx.contribute(uiActionItemsSlot, videoActionItems),
	}),
]

/**
 * One plugin for each default tool that does not create a shape, with its tool item in the UI.
 * The zoom tool has an action instead of a tool item. The plugin ids are the tool id followed by `Tool`, for example
 * `eraserTool`.
 *
 * @public
 */
export const defaultToolPlugins: readonly TLPlugin[] = [
	definePlugin({
		id: 'eraserTool',
		tools: [EraserTool],
		setup: (ctx) => void ctx.contribute(uiToolItemsSlot, eraserToolItems),
	}),
	definePlugin({
		id: 'handTool',
		tools: [HandTool],
		setup: (ctx) => void ctx.contribute(uiToolItemsSlot, handToolItems),
	}),
	definePlugin({
		id: 'laserTool',
		tools: [LaserTool],
		setup: (ctx) => void ctx.contribute(uiToolItemsSlot, laserToolItems),
	}),
	definePlugin({
		id: 'zoomTool',
		tools: [ZoomTool],
		setup: (ctx) => void ctx.contribute(uiActionItemsSlot, zoomActionItems),
	}),
	definePlugin({
		id: 'selectTool',
		tools: [SelectTool],
		setup: (ctx) => void ctx.contribute(uiToolItemsSlot, selectToolItems),
	}),
]

/**
 * The plugins that `<Tldraw>` installs when you do not pass `plugins`: the editor's
 * {@link @tldraw/editor#createDefaultPlugins}, then {@link defaultToolPlugins} and
 * {@link defaultShapePlugins}. The `plugins` prop is the complete list, so spread this to add
 * your own plugins.
 *
 * @example
 * ```tsx
 * <Tldraw plugins={[...createTldrawPlugins(), myPlugin]} />
 * ```
 *
 * @public
 */
export function createTldrawPlugins(): TLPlugin[] {
	return [...createDefaultPlugins(), ...defaultToolPlugins, ...defaultShapePlugins]
}
