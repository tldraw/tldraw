import { ArrowShapeTool } from '../editor/shapes/ArrowShape/ArrowShapeTool/ArrowShapeTool'
import { DrawShapeTool } from '../editor/shapes/DrawShape/DrawShapeTool/DrawShapeTool'
import { GeoShapeTool } from '../editor/shapes/GeoShape/GeoShapeTool/GeoShapeTool'
import { HighlightShapeTool } from '../editor/shapes/HighlightShape/HighlightShapeTool/HighlightShapeTool'
import { EraserTool } from '../editor/tools/EraserTool/EraserTool'
import { FrameShapeTool } from '../editor/tools/FrameShapeTool/FrameShapeTool'
import { HandTool } from '../editor/tools/HandTool/HandTool'
import { LaserTool } from '../editor/tools/LaserTool/LaserTool'
import { LineShapeTool } from '../editor/tools/LineShapeTool/LineShapeTool'
import { NoteShapeTool } from '../editor/tools/NoteShapeTool/NoteShapeTool'
import { TLStateNodeConstructor } from '../editor/tools/StateNode'
import { TextShapeTool } from '../editor/tools/TextShapeTool/TextShapeTool'

/** @public */
export const defaultTools: TLStateNodeConstructor[] = [
	HandTool,
	EraserTool,
	LaserTool,
	DrawShapeTool,
	TextShapeTool,
	LineShapeTool,
	ArrowShapeTool,
	GeoShapeTool,
	NoteShapeTool,
	FrameShapeTool,
	HighlightShapeTool,
]
