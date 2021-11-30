import { Vec } from '@tldraw/vec'
import { TLNuShape, TLNuState } from '~nu-lib'
import type { TLNuBinding, TLNuKeyboardHandler, TLNuPointerHandler, TLNuWheelHandler } from '~types'

export class TranslatingShapesState<S extends TLNuShape, B extends TLNuBinding> extends TLNuState<
  S,
  B
> {
  readonly id = 'translatingShapes'

  initialPoints: Record<string, number[]> = {}

  onEnter = () => {
    this.initialPoints = Object.fromEntries(
      this.app.selectedShapes.map((shape) => [shape.id, shape.point])
    )
  }

  onExit = () => (this.initialPoints = {})

  onPan: TLNuWheelHandler<S> = (info, e) => {
    this.onPointerMove(info, e)
  }

  onPointerMove: TLNuPointerHandler<S> = () => {
    const {
      inputs: { shiftKey, originPoint, currentPoint },
    } = this.app

    const { initialPoints } = this

    const delta = Vec.sub(currentPoint, originPoint)

    if (shiftKey) {
      if (Math.abs(delta[0]) < Math.abs(delta[1])) {
        delta[0] = 0
      } else {
        delta[1] = 0
      }
    }

    this.app.selectedShapes.forEach((shape) => {
      shape.update({ point: Vec.add(initialPoints[shape.id], delta) })
    })
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.tool.transition('idle')
  }

  onKeyDown: TLNuKeyboardHandler<S> = (info, e) => {
    switch (e.key) {
      case 'Escape': {
        this.app.selectedShapes.forEach((shape) => {
          shape.update({ point: this.initialPoints[shape.id] })
        })
        this.tool.transition('idle')
        break
      }
    }
  }
}
