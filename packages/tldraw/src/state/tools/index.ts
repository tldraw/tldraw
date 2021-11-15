import type { TLDrawApp } from '~state'
import { TLDrawShapeType, TLDrawToolType } from '~types'
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
  [TLDrawShapeType.Text]: typeof TextTool
  [TLDrawShapeType.Draw]: typeof DrawTool
  [TLDrawShapeType.Ellipse]: typeof EllipseTool
  [TLDrawShapeType.Rectangle]: typeof RectangleTool
  [TLDrawShapeType.Arrow]: typeof ArrowTool
  [TLDrawShapeType.Sticky]: typeof StickyTool
}

export type ToolOfType<K extends TLDrawToolType> = ToolsMap[K]

export type ArgsOfType<K extends TLDrawToolType> = ConstructorParameters<ToolOfType<K>>

export const tools: { [K in TLDrawToolType]: ToolsMap[K] } = {
  select: SelectTool,
  erase: EraseTool,
  [TLDrawShapeType.Text]: TextTool,
  [TLDrawShapeType.Draw]: DrawTool,
  [TLDrawShapeType.Ellipse]: EllipseTool,
  [TLDrawShapeType.Rectangle]: RectangleTool,
  [TLDrawShapeType.Arrow]: ArrowTool,
  [TLDrawShapeType.Sticky]: StickyTool,
}

export const getTool = <K extends TLDrawToolType>(type: K): ToolOfType<K> => {
  return tools[type]
}

export function createTools(state: TLDrawApp): Record<TLDrawToolType, BaseTool> {
  return {
    select: new SelectTool(state),
    erase: new EraseTool(state),
    [TLDrawShapeType.Text]: new TextTool(state),
    [TLDrawShapeType.Draw]: new DrawTool(state),
    [TLDrawShapeType.Ellipse]: new EllipseTool(state),
    [TLDrawShapeType.Rectangle]: new RectangleTool(state),
    [TLDrawShapeType.Arrow]: new ArrowTool(state),
    [TLDrawShapeType.Sticky]: new StickyTool(state),
  }
}
