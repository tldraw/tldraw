import { ArrowShapeTool } from '../editor/tools/ArrowShapeTool/ArrowShapeTool'
import { DrawShapeTool } from '../editor/tools/DrawShapeTool/DrawShapeTool'
import { EraserTool } from '../editor/tools/EraserTool/EraserTool'
import { FrameShapeTool } from '../editor/tools/FrameShapeTool/FrameShapeTool'
import { GeoShapeTool } from '../editor/tools/GeoShapeTool/GeoShapeTool'
import { HandTool } from '../editor/tools/HandTool/HandTool'
import { HighlightShapeTool } from '../editor/tools/HighlightShapeTool/HighlightShapeTool'
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
