/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  BoundsUtils,
  TLNuBinding,
  TLNuKeyboardHandler,
  TLNuPointerHandler,
  TLNuTool,
  TLNuToolComponentProps,
  TLNuWheelHandler,
  uniqueId,
} from '@tldraw/next'
import Vec from '@tldraw/vec'
import { NuBoxShape, Shape } from 'stores'

enum Status {
  Idle = 'idle',
  Pointing = 'pointing',
  Creating = 'creating',
}

export class NuBoxTool extends TLNuTool<Shape, TLNuBinding, Status> {
  readonly id = 'box'

  readonly label = 'Box'

  readonly shortcut = '2'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>B</span>
  }

  private creatingShape?: NuBoxShape

  /* --------------------- Events --------------------- */

  onPan: TLNuWheelHandler<Shape> = (info, e) => {
    this.onPointerMove(info, e as any)
  }

  onPointerDown: TLNuPointerHandler<Shape> = (info, e) => {
    if (info.order > 0) return

    switch (this.status) {
      case Status.Idle: {
        this.setStatus(Status.Pointing)
        break
      }
    }
  }

  onPointerMove: TLNuPointerHandler<Shape> = (info, e) => {
    switch (this.status) {
      case Status.Pointing: {
        const { currentPoint, originPoint } = this.app.inputs
        if (Vec.dist(currentPoint, originPoint) > 5) {
          const shape = new NuBoxShape({
            id: uniqueId(),
            parentId: this.app.currentPage.id,
            point: this.app.inputs.currentPoint,
            size: [1, 1],
          })

          this.creatingShape = shape
          this.app.currentPage.addShape(shape)
          this.setStatus(Status.Creating)
        }
        break
      }
      case Status.Creating: {
        // Update shape
        const { currentPoint, originPoint } = this.app.inputs
        const bounds = BoundsUtils.getBoundsFromPoints([currentPoint, originPoint])
        this.creatingShape!.update({
          point: [bounds.minX, bounds.minY],
          size: [bounds.width, bounds.height],
        })
        break
      }
    }
  }

  onPointerUp: TLNuPointerHandler<Shape> = (info, e) => {
    switch (this.status) {
      case Status.Pointing: {
        this.setStatus(Status.Idle)
        break
      }
      case Status.Creating: {
        // Finish shape
        this.setStatus(Status.Idle)
        this.app.selectTool(this.app.tools.select)
        break
      }
    }
  }

  onKeyDown: TLNuKeyboardHandler<Shape> = (info, e) => {
    switch (e.key) {
      case 'Shift':
      case 'Alt':
      case 'Ctrl':
      case 'Meta': {
        this.onPointerMove(info, e as any)
        break
      }
      case 'Escape': {
        this.app.currentPage.removeShape(this.creatingShape!)
        this.setStatus(Status.Idle)
        break
      }
    }
  }
}
