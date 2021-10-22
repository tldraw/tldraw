import { Utils } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import type { TLDrawCommand, Data, TLDrawShape } from '~types'
import { TLDR } from '~state/tldr'

const PI2 = Math.PI * 2

export function rotate(data: Data, ids: string[], delta = -PI2 / 4): TLDrawCommand | void {
  const { currentPageId } = data.appState

  // The shapes for the before patch
  const before: Record<string, Partial<TLDrawShape>> = {}

  // The shapes for the after patch
  const after: Record<string, Partial<TLDrawShape>> = {}

  // Find the shapes that we want to rotate.
  // We don't rotate groups: we rotate their children instead.
  const shapesToRotate = ids.flatMap((id) => {
    const shape = TLDR.getShape(data, id, currentPageId)
    return shape.children
      ? shape.children.map((childId) => TLDR.getShape(data, childId, currentPageId))
      : shape
  })

  // Find the common center to all shapes
  // This is the point that we'll rotate around
  const origin = Utils.getBoundsCenter(
    Utils.getCommonBounds(shapesToRotate.map((shape) => TLDR.getBounds(shape)))
  )

  // Find the rotate mutations for each shape
  shapesToRotate.forEach((shape) => {
    const change = TLDR.getRotatedShapeMutation(shape, TLDR.getCenter(shape), origin, delta)
    if (!change) return
    before[shape.id] = TLDR.getBeforeShape(shape, change)
    after[shape.id] = change
  })

  // Also rotate the bounds.
  const beforeBoundsRotation = TLDR.getPageState(data, currentPageId).boundsRotation

  const afterBoundsRotation = Utils.clampRadians((beforeBoundsRotation || 0) + delta)

  return {
    id: 'rotate',
    before: {
      document: {
        pages: {
          [currentPageId]: { shapes: before },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: ids,
            boundsRotation: beforeBoundsRotation,
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: { shapes: after },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: ids,
            boundsRotation: afterBoundsRotation,
          },
        },
      },
    },
  }
}
