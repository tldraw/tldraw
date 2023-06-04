import { ArrowShapeTool } from '../app/tools/ArrowShapeTool/ArrowShapeTool'
import { DrawShapeTool } from '../app/tools/DrawShapeTool/DrawShapeTool'
import { EraserShapeTool } from '../app/tools/EraserShapeTool/EraserShapeTool'
import { FrameShapeTool } from '../app/tools/FrameShapeTool/FrameShapeTool'
import { GeoShapeTool } from '../app/tools/GeoShapeTool/GeoShapeTool'
import { HandTool } from '../app/tools/HandTool/HandTool'
import { HighlightShapeTool } from '../app/tools/HighlightShapeTool/HighlightShapeTool'
import { LaserTool } from '../app/tools/LaserTool/LaserTool'
import { LineShapeTool } from '../app/tools/LineShapeTool/LineShapeTool'
import { NoteShapeTool } from '../app/tools/NoteShapeTool/NoteShapeTool'
import { TLStateNodeConstructor } from '../app/tools/StateNode'
import { TextShapeTool } from '../app/tools/TextShapeTool/TextShapeTool'

/** @public */
export const defaultTools: TLStateNodeConstructor[] = [
	HandTool,
	EraserShapeTool,
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
