import { TLNuPointerHandler, TLNuState } from '@tldraw/next'
import type { NuPolygonShape } from 'stores'

export class CreatingState extends TLNuState<NuPolygonShape> {
  static id = 'idle'

  onPointerDown: TLNuPointerHandler<NuPolygonShape> = (info, e) => {
    if (info.order > 0) return
    this.tool.transition('pointing')
  }

  onPointerUp: TLNuPointerHandler<NuPolygonShape> = () => {
    this.tool.transition('idle')
    this.app.selectTool('select')
  }
}
