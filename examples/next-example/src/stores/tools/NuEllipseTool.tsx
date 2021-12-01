/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
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
import { NuEllipseShape, Shape } from 'stores'

enum Status {
  Idle = 'idle',
  Pointing = 'pointing',
  Creating = 'creating',
}

export class NuEllipseTool extends TLNuTool<Shape, TLNuBinding, Status> {
  readonly id = 'ellipse'

  readonly label = 'Ellipse'

  readonly shortcut = '3,o'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>O</span>
  }

  private creatingShape?: NuEllipseShape

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
          const shape = new NuEllipseShape({
            id: uniqueId(),
            parentId: this.app.currentPage.id,
            point: this.app.inputs.currentPoint,
            size: [1, 1],
          })

          this.creatingShape = shape
          this.app.currentPage.addShapes(shape)
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
        this.app.selectTool(this.app.tools[0])
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
        this.app.currentPage.removeShapes(this.creatingShape!)
        this.setStatus(Status.Idle)
        break
      }
    }
  }
}
