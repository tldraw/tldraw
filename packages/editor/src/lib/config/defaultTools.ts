import { EraserTool } from '../editor/tools/EraserTool/EraserTool'
import { HandTool } from '../editor/tools/HandTool/HandTool'
import { LaserTool } from '../editor/tools/LaserTool/LaserTool'
import { TLStateNodeConstructor } from '../editor/tools/StateNode'

/** @public */
export const defaultTools: TLStateNodeConstructor[] = [HandTool, EraserTool, LaserTool]
