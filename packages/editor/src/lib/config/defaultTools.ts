import { ArrowTool } from '../app/statechart/ArrowTool/ArrowTool'
import { DrawTool } from '../app/statechart/DrawTool/DrawTool'
import { EraserTool } from '../app/statechart/EraserTool/EraserTool'
import { FrameTool } from '../app/statechart/FrameTool/FrameTool'
import { GeoTool } from '../app/statechart/GeoTool/GeoTool'
import { HandTool } from '../app/statechart/HandTool/HandTool'
import { HighlightTool } from '../app/statechart/HighlightTool/HighlightTool'
import { LaserTool } from '../app/statechart/LaserTool/LaserTool'
import { LineTool } from '../app/statechart/LineTool/LineTool'
import { NoteTool } from '../app/statechart/NoteTool/NoteTool'
import { TLStateNodeConstructor } from '../app/statechart/StateNode'
import { TextTool } from '../app/statechart/TextTool/TextTool'

/** @public */
export const defaultTools: TLStateNodeConstructor[] = [
	HandTool,
	EraserTool,
	LaserTool,
	DrawTool,
	TextTool,
	LineTool,
	ArrowTool,
	GeoTool,
	NoteTool,
	FrameTool,
	HighlightTool,
]
