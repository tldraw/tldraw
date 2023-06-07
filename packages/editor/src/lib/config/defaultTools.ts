import { EraserTool } from '../editor/tools/EraserTool/EraserTool'
import { HandTool } from '../editor/tools/HandTool/HandTool'
import { LaserTool } from '../editor/tools/LaserTool/LaserTool'
import { TLStateNodeConstructor } from '../editor/tools/StateNode'
import { TextShapeTool } from '../editor/tools/TextShapeTool/TextShapeTool'

/** @public */
export const defaultTools: TLStateNodeConstructor[] = [
	HandTool,
	EraserTool,
	LaserTool,
	TextShapeTool,
]
