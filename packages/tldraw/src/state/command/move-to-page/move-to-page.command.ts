/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { ArrowShape, Data, PagePartial, TLDrawCommand, TLDrawShape } from '~types'
import { TLDR } from '~state/tldr'
import { Utils } from '@tldraw/core'
import { Vec } from '@tldraw/vec'

export function moveToPage(
  data: Data,
  ids: string[],
  fromPageId: string,
  toPageId: string
): TLDrawCommand {
  const { currentPageId } = data.appState

  const page = TLDR.getPage(data, currentPageId)

  const fromPage: Record<string, PagePartial> = {
    before: {
      shapes: {},
      bindings: {},
    },
    after: {
      shapes: {},
      bindings: {},
    },
  }

  const toPage: Record<string, PagePartial> = {
    before: {
      shapes: {},
      bindings: {},
    },
    after: {
      shapes: {},
      bindings: {},
    },
  }

  // Collect all the shapes to move and their keys.
  const movingShapeIds = new Set<string>()
  const shapesToMove = new Set<TLDrawShape>()

  ids
    .map((id) => TLDR.getShape(data, id, fromPageId))
    .forEach((shape) => {
      movingShapeIds.add(shape.id)
      shapesToMove.add(shape)
      if (shape.children !== undefined) {
        shape.children.forEach((childId) => {
          movingShapeIds.add(childId)
          shapesToMove.add(TLDR.getShape(data, childId, fromPageId))
        })
      }
    })

  // Where should we put start putting shapes on the "to" page?
  const startingChildIndex = TLDR.getTopChildIndex(data, toPageId)

  // Which shapes are we moving?
  const movingShapes = Array.from(shapesToMove.values())

  movingShapes.forEach((shape, i) => {
    // Remove the shape from the fromPage
    fromPage.before.shapes[shape.id] = shape
    fromPage.after.shapes[shape.id] = undefined

    // But the moved shape on the "to" page
    toPage.before.shapes[shape.id] = undefined
    toPage.after.shapes[shape.id] = shape

    // If the shape's parent isn't moving too, reparent the shape to
    // the "to" page, at the top of the z stack
    if (!movingShapeIds.has(shape.parentId)) {
      toPage.after.shapes[shape.id] = {
        ...shape,
        parentId: toPageId,
        childIndex: startingChildIndex + i,
      }

      // If the shape was in a group, then pull the shape from the
      // parent's children array.
      if (shape.parentId !== fromPageId) {
        const parent = TLDR.getShape(data, shape.parentId, fromPageId)
        fromPage.before.shapes[parent.id] = {
          children: parent.children,
        }

        fromPage.after.shapes[parent.id] = {
          children: parent.children!.filter((childId) => childId !== shape.id),
        }
      }
    }
  })

  // Handle bindings that effect duplicated shapes
  Object.values(page.bindings)
    .filter((binding) => movingShapeIds.has(binding.fromId) || movingShapeIds.has(binding.toId))
    .forEach((binding) => {
      // Always delete the binding from the from page

      fromPage.before.bindings[binding.id] = binding
      fromPage.after.bindings[binding.id] = undefined

      // Delete the reference from the binding's fromShape

      const fromBoundShape = TLDR.getShape(data, binding.fromId, fromPageId)

      // Will we be copying this binding to the new page?

      const shouldCopy = movingShapeIds.has(binding.fromId) && movingShapeIds.has(binding.toId)

      if (shouldCopy) {
        // Just move the binding to the new page
        toPage.before.bindings[binding.id] = undefined
        toPage.after.bindings[binding.id] = binding
      } else {
        if (movingShapeIds.has(binding.fromId)) {
          // If we are only moving the "from" shape, we need to delete
          // the binding reference from the "from" shapes handles
          const fromShape = TLDR.getShape(data, binding.fromId, fromPageId)
          const handle = Object.values(fromBoundShape.handles!).find(
            (handle) => handle.bindingId === binding.id
          )!

          // Remove the handle from the shape on the toPage

          const handleId = handle.id as keyof ArrowShape['handles']

          const toPageShape = toPage.after.shapes[fromShape.id]!

          toPageShape.handles = {
            ...toPageShape.handles,
            [handleId]: {
              ...toPageShape.handles![handleId],
              bindingId: undefined,
            },
          }
        } else {
          // If we are only moving the "to" shape, we need to delete
          // the binding reference from the "from" shape's handles
          const fromShape = TLDR.getShape(data, binding.fromId, fromPageId)
          const handle = Object.values(fromBoundShape.handles!).find(
            (handle) => handle.bindingId === binding.id
          )!

          fromPage.before.shapes[fromShape.id] = {
            handles: { [handle.id]: { bindingId: binding.id } },
          }

          fromPage.after.shapes[fromShape.id] = {
            handles: { [handle.id]: { bindingId: undefined } },
          }
        }
      }
    })

  // Finally, center camera on selection

  const toPageState = data.document.pageStates[toPageId]
  const bounds = Utils.getCommonBounds(movingShapes.map((shape) => TLDR.getBounds(shape)))
  const zoom = TLDR.getCameraZoom(
    window.innerWidth < window.innerHeight
      ? (window.innerWidth - 128) / bounds.width
      : (window.innerHeight - 128) / bounds.height
  )
  const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
  const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom
  const point = Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my]))

  return {
    id: 'move_to_page',
    before: {
      appState: {
        currentPageId: fromPageId,
      },
      document: {
        pages: {
          [fromPageId]: fromPage.before,
          [toPageId]: toPage.before,
        },
        pageStates: {
          [fromPageId]: { selectedIds: ids },
          [toPageId]: {
            selectedIds: toPageState.selectedIds,
            camera: toPageState.camera,
          },
        },
      },
    },
    after: {
      appState: {
        currentPageId: toPageId,
      },
      document: {
        pages: {
          [fromPageId]: fromPage.after,
          [toPageId]: toPage.after,
        },
        pageStates: {
          [fromPageId]: { selectedIds: [] },
          [toPageId]: {
            selectedIds: ids,
            camera: {
              zoom,
              point,
            },
          },
        },
      },
    },
  }
}
