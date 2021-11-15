import { TLBounds, Utils } from '@tldraw/core'
import { SessionType, TLDrawPatch, TLDrawStatus, TLDrawCommand } from '~types'
import type { TLDrawApp } from '../../internal'
import { BaseSession } from '../BaseSession'

export class BrushSession extends BaseSession {
  type = SessionType.Brush
  status = TLDrawStatus.Brushing
  initialSelectedIds: Set<string>
  shapesToTest: {
    id: string
    bounds: TLBounds
    selectId: string
  }[]

  constructor(app: TLDrawApp) {
    super(app)
    this.initialSelectedIds = new Set(this.app.selectedIds)
    this.shapesToTest = this.app.shapes
      .filter(
        (shape) =>
          !(
            shape.isLocked ||
            shape.isHidden ||
            shape.children !== undefined ||
            this.initialSelectedIds.has(shape.id) ||
            this.initialSelectedIds.has(shape.parentId)
          )
      )
      .map((shape) => ({
        id: shape.id,
        bounds: this.app.getShapeUtils(shape).getBounds(shape),
        selectId: shape.id, //TLDR.getTopParentId(data, shape.id, currentPageId),
      }))
  }

  start = (): TLDrawPatch | undefined => void null

  update = (): TLDrawPatch | undefined => {
    const {
      initialSelectedIds,
      shapesToTest,
      app: {
        mutables: { originPoint, currentPoint },
      },
    } = this

    // Create a bounding box between the origin and the new point
    const brush = Utils.getBoundsFromPoints([originPoint, currentPoint])

    // Find ids of brushed shapes
    const hits = new Set<string>()

    const selectedIds = new Set(initialSelectedIds)

    shapesToTest.forEach(({ id, selectId }) => {
      if (selectedIds.has(id)) return

      const { metaKey } = this.app.mutables

      const shape = this.app.getShape(id)

      if (!hits.has(selectId)) {
        const util = this.app.getShapeUtils(shape)
        if (
          metaKey
            ? Utils.boundsContain(brush, util.getBounds(shape))
            : util.hitTestBounds(shape, brush)
        ) {
          hits.add(selectId)

          // When brushing a shape, select its top group parent.
          if (!selectedIds.has(selectId)) {
            selectedIds.add(selectId)
          }
        } else if (selectedIds.has(selectId)) {
          selectedIds.delete(selectId)
        }
      }
    })

    const currentSelectedIds = this.app.selectedIds

    const didChange =
      selectedIds.size !== currentSelectedIds.length ||
      currentSelectedIds.some((id) => !selectedIds.has(id))

    const afterSelectedIds = didChange ? Array.from(selectedIds.values()) : currentSelectedIds

    return {
      document: {
        pageStates: {
          [this.app.currentPageId]: {
            brush,
            selectedIds: afterSelectedIds,
          },
        },
      },
    }
  }

  cancel = (): TLDrawPatch | undefined => {
    return {
      document: {
        pageStates: {
          [this.app.currentPageId]: {
            brush: null,
            selectedIds: Array.from(this.initialSelectedIds.values()),
          },
        },
      },
    }
  }

  complete = (): TLDrawPatch | TLDrawCommand | undefined => {
    return {
      document: {
        pageStates: {
          [this.app.currentPageId]: {
            brush: null,
            selectedIds: [...this.app.selectedIds],
          },
        },
      },
    }
  }
}
