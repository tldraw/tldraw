/* eslint-disable @typescript-eslint/no-non-null-assertion */

import Vec from '@tldraw/vec'
import type { TLNuShape } from './TLNuShape'
import type { TLNuApp } from './TLNuApp'
import { TLNuTool } from './TLNuTool'
import {
  TLNuBinding,
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuPointerHandler,
  TLNuTargetType,
  TLNuWheelHandler,
} from '~types'
import { BoundsUtils } from '~utils'
import type { TLNuToolComponentProps } from '~nu-lib'

enum Status {
  Idle = 'idle',
  PointingCanvas = 'pointingCanvas',
  Brushing = 'brushing',
  PointingShape = 'pointingShape',
  TranslatingShapes = 'translatingShapes',
  PointingBounds = 'pointingBounds',
}

export class TLNuSelectTool<S extends TLNuShape, B extends TLNuBinding> extends TLNuTool<
  S,
  B,
  Status
> {
  readonly id = 'select'

  readonly label = 'Select'

  readonly shortcut = '1'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>S</span>
  }

  /* -------------------- Mutables -------------------- */

  private pointedShape?: S

  private brushSnapshot?: {
    selectedIds: string[]
  }

  private translateSnapshot?: {
    initialPoints: Record<string, number[]>
  }

  /* --------------------- Events --------------------- */

  onPan: TLNuWheelHandler<S> = (info, e) => {
    this.onPointerMove(info, e as any)
  }

  onPointerEnter: TLNuPointerHandler<S> = (info, e) => {
    if (info.order > 0) return

    if (info.type === TLNuTargetType.Shape) {
      this.app.hoverShape(info.target)
    }
  }

  onPointerDown: TLNuPointerHandler<S> = (info, e) => {
    if (info.order > 0) return

    switch (info.type) {
      case TLNuTargetType.Shape: {
        if (this.app.selectedShapes.includes(info.target)) {
          this.pointedShape = info.target
          this.setStatus(Status.PointingBounds)
        } else {
          this.app.select(info.target.id)
          this.setStatus(Status.PointingShape)
        }
        break
      }
      case TLNuTargetType.Bounds: {
        this.setStatus(Status.PointingBounds)
        break
      }
      case TLNuTargetType.Canvas: {
        this.app.deselectAll()
        this.setStatus(Status.PointingCanvas)
        break
      }
    }
  }

  onPointerMove: TLNuPointerHandler<S> = (info, e) => {
    switch (this.status) {
      case Status.PointingCanvas: {
        const { currentPoint, originPoint } = this.app.inputs
        if (Vec.dist(currentPoint, originPoint) > 5) {
          this.setStatus(Status.Brushing)
          this.brushSnapshot = { selectedIds: [...this.app.selectedIds] }
        }
        break
      }
      case Status.PointingBounds:
      case Status.PointingShape: {
        const { currentPoint, originPoint } = this.app.inputs
        if (Vec.dist(currentPoint, originPoint) > 5) {
          this.setStatus(Status.TranslatingShapes)
          this.translateSnapshot = {
            initialPoints: Object.fromEntries(
              this.app.selectedShapes.map((shape) => [shape.id, shape.point])
            ),
          }
        }
        break
      }
      case Status.Brushing: {
        const {
          inputs: { shiftKey, ctrlKey, originPoint, currentPoint },
        } = this.app

        const brushBounds = BoundsUtils.getBoundsFromPoints([currentPoint, originPoint], 0)

        this.app.setBrush(brushBounds)

        const hits = this.app.currentPage.shapes
          .filter((shape) =>
            ctrlKey
              ? BoundsUtils.boundsContain(brushBounds, shape.bounds)
              : shape.hitTestBounds(brushBounds)
          )
          .map((shape) => shape.id)

        this.app.select(
          ...(shiftKey
            ? Array.from(new Set([...this.brushSnapshot!.selectedIds, ...hits]).values())
            : hits)
        )
        break
      }
      case Status.TranslatingShapes: {
        const {
          inputs: { shiftKey, originPoint, currentPoint },
        } = this.app

        const { initialPoints } = this.translateSnapshot!

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

        break
      }
    }
  }

  onPointerUp: TLNuPointerHandler<S> = (info, e) => {
    switch (this.status) {
      case Status.PointingCanvas: {
        break
      }
      case Status.PointingShape: {
        break
      }
      case Status.PointingBounds: {
        if (this.pointedShape) {
          this.app.select(this.pointedShape.id)
        } else {
          this.app.select()
        }
        break
      }
      case Status.Brushing: {
        this.brushSnapshot = undefined
        this.app.clearBrush()
        this.setStatus(Status.Idle)
        break
      }
      case Status.TranslatingShapes: {
        this.translateSnapshot = undefined
        break
      }
    }

    this.setStatus(Status.Idle)
  }

  onPointerLeave: TLNuPointerHandler<S> = (info, e) => {
    if (info.order > 0) return

    if (info.type === TLNuTargetType.Shape) {
      if (this.app.hoveredId) {
        this.app.clearHoveredShape()
      }
    }
  }

  onKeyDown: TLNuKeyboardHandler<S> = (info, e) => {
    // noop
  }

  onKeyUp: TLNuKeyboardHandler<S> = (info, e) => {
    // noop
  }
}
