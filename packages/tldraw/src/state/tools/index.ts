import type { TldrawApp } from '~state'
import { TldrawShapeType, TldrawToolType } from '~types'
import type { BaseTool } from './BaseTool'
import { ArrowTool } from './ArrowTool'
import { DrawTool } from './DrawTool'
import { EllipseTool } from './EllipseTool'
import { RectangleTool } from './RectangleTool'
import { SelectTool } from './SelectTool'
import { StickyTool } from './StickyTool'
import { TextTool } from './TextTool'
import { EraseTool } from './EraseTool'

export interface ToolsMap {
  select: typeof SelectTool
  erase: typeof EraseTool
  [TldrawShapeType.Text]: typeof TextTool
  [TldrawShapeType.Draw]: typeof DrawTool
  [TldrawShapeType.Ellipse]: typeof EllipseTool
  [TldrawShapeType.Rectangle]: typeof RectangleTool
  [TldrawShapeType.Arrow]: typeof ArrowTool
  [TldrawShapeType.Sticky]: typeof StickyTool
}

export type ToolOfType<K extends TldrawToolType> = ToolsMap[K]

export type ArgsOfType<K extends TldrawToolType> = ConstructorParameters<ToolOfType<K>>

export const tools: { [K in TldrawToolType]: ToolsMap[K] } = {
  select: SelectTool,
  erase: EraseTool,
  [TldrawShapeType.Text]: TextTool,
  [TldrawShapeType.Draw]: DrawTool,
  [TldrawShapeType.Ellipse]: EllipseTool,
  [TldrawShapeType.Rectangle]: RectangleTool,
  [TldrawShapeType.Arrow]: ArrowTool,
  [TldrawShapeType.Sticky]: StickyTool,
}
