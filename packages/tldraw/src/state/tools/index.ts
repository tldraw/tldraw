import { TDShapeType, TDToolType } from '~types'
import { ArrowTool } from './ArrowTool'
import { LineTool } from './LineTool'
import { DrawTool } from './DrawTool'
import { EllipseTool } from './EllipseTool'
import { RectangleTool } from './RectangleTool'
import { TriangleTool } from './TriangleTool'
import { SelectTool } from './SelectTool'
import { StickyTool } from './StickyTool'
import { TextTool } from './TextTool'
import { EraseTool } from './EraseTool'

export interface ToolsMap {
  select: typeof SelectTool
  erase: typeof EraseTool
  [TDShapeType.Text]: typeof TextTool
  [TDShapeType.Draw]: typeof DrawTool
  [TDShapeType.Ellipse]: typeof EllipseTool
  [TDShapeType.Rectangle]: typeof RectangleTool
  [TDShapeType.Triangle]: typeof TriangleTool
  [TDShapeType.Line]: typeof LineTool
  [TDShapeType.Arrow]: typeof ArrowTool
  [TDShapeType.Sticky]: typeof StickyTool
}

export type ToolOfType<K extends TDToolType> = ToolsMap[K]

export type ArgsOfType<K extends TDToolType> = ConstructorParameters<ToolOfType<K>>

export const tools: { [K in TDToolType]: ToolsMap[K] } = {
  select: SelectTool,
  erase: EraseTool,
  [TDShapeType.Text]: TextTool,
  [TDShapeType.Draw]: DrawTool,
  [TDShapeType.Ellipse]: EllipseTool,
  [TDShapeType.Rectangle]: RectangleTool,
  [TDShapeType.Triangle]: TriangleTool,
  [TDShapeType.Line]: LineTool,
  [TDShapeType.Arrow]: ArrowTool,
  [TDShapeType.Sticky]: StickyTool,
}
