import { ArrowShapeTool } from '../editor/shapes/arrow/ArrowShapeTool'
import { DrawShapeTool } from '../editor/shapes/draw/DrawShapeTool'
import { FrameShapeTool } from '../editor/shapes/frame/FrameShapeTool'
import { GeoShapeTool } from '../editor/shapes/geo/GeoShapeTool'
import { HighlightShapeTool } from '../editor/shapes/highlight/HighlightShapeTool'
import { LineShapeTool } from '../editor/shapes/line/LineShapeTool'
import { NoteShapeTool } from '../editor/shapes/note/NoteShapeTool'
import { TextShapeTool } from '../editor/shapes/text/TextShapeTool'
import { EraserTool } from '../editor/tools/EraserTool/EraserTool'
import { HandTool } from '../editor/tools/HandTool/HandTool'
import { LaserTool } from '../editor/tools/LaserTool/LaserTool'
import { TLStateNodeConstructor } from '../editor/tools/StateNode'

/** @public */
export const coreTools = [
	// created by copy and paste
	TextShapeTool,
]

/** @public */
export const defaultTools: TLStateNodeConstructor[] = [
	HandTool,
	EraserTool,
	LaserTool,
	DrawShapeTool,
	GeoShapeTool,
	LineShapeTool,
	NoteShapeTool,
	FrameShapeTool,
	ArrowShapeTool,
	HighlightShapeTool,
]
