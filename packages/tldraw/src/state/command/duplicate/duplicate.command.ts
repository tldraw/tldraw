/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Utils, Vec } from '@tldraw/core'
import { TLDR } from '~state/tldr'
import type { Data, PagePartial, TLDrawCommand } from '~types'

export function duplicate(data: Data, ids: string[]): TLDrawCommand {
  const { currentPageId } = data.appState

  const page = TLDR.getPage(data, currentPageId)

  const delta = Vec.div([16, 16], TLDR.getCamera(data, currentPageId).zoom)

  const before: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const after: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const shapes = TLDR.getSelectedIds(data, currentPageId).map((id) =>
    TLDR.getShape(data, id, currentPageId)
  )

  const duplicateMap: Record<string, string> = {}

  // Create duplicates
  shapes
    .filter((shape) => !ids.includes(shape.parentId))
    .forEach((shape) => {
      const duplicatedId = Utils.uniqueId()
      before.shapes[duplicatedId] = null

      after.shapes[duplicatedId] = {
        ...Utils.deepClone(shape),
        id: duplicatedId,
        point: Vec.round(Vec.add(shape.point, delta)),
        childIndex: TLDR.getChildIndexAbove(data, shape.id, currentPageId),
      }

      if (shape.children) {
        after.shapes[duplicatedId]!.children = []
      }

      if (shape.parentId !== currentPageId) {
        const parent = TLDR.getShape(data, shape.parentId, currentPageId)

        before.shapes[parent.id] = {
          ...before.shapes[parent.id],
          children: parent.children,
        }

        after.shapes[parent.id] = {
          ...after.shapes[parent.id],
          children: [...(after.shapes[parent.id] || parent).children!, duplicatedId],
        }
      }

      duplicateMap[shape.id] = duplicatedId
    })

  // If the shapes have children, then duplicate those too
  shapes.forEach((shape) => {
    if (shape.children) {
      shape.children.forEach((childId) => {
        const child = TLDR.getShape(data, childId, currentPageId)
        const duplicatedId = Utils.uniqueId()
        const duplicatedParentId = duplicateMap[shape.id]
        before.shapes[duplicatedId] = null
        after.shapes[duplicatedId] = {
          ...Utils.deepClone(child),
          id: duplicatedId,
          parentId: duplicatedParentId,
          point: Vec.round(Vec.add(child.point, delta)),
          childIndex: TLDR.getChildIndexAbove(data, child.id, currentPageId),
        }
        duplicateMap[childId] = duplicatedId
        after.shapes[duplicateMap[shape.id]]?.children?.push(duplicatedId)
      })
    }
  })

  // Which ids did we end up duplicating?
  const dupedShapeIds = new Set(Object.keys(duplicateMap))

  // Handle bindings that effect duplicated shapes
  Object.values(page.bindings)
    .filter((binding) => dupedShapeIds.has(binding.fromId) || dupedShapeIds.has(binding.toId))
    .forEach((binding) => {
      if (dupedShapeIds.has(binding.fromId)) {
        if (dupedShapeIds.has(binding.toId)) {
          // If the binding is between two duplicating shapes then
          // duplicate the binding, too
          const duplicatedBindingId = Utils.uniqueId()

          const duplicatedBinding = {
            ...Utils.deepClone(binding),
            id: duplicatedBindingId,
            fromId: duplicateMap[binding.fromId],
            toId: duplicateMap[binding.toId],
          }

          before.bindings[duplicatedBindingId] = null
          after.bindings[duplicatedBindingId] = duplicatedBinding

          // Change the duplicated shape's handle so that it reference
          // the duplicated binding
          const boundShape = after.shapes[duplicatedBinding.fromId]
          Object.values(boundShape!.handles!).forEach((handle) => {
            if (handle!.bindingId === binding.id) {
              handle!.bindingId = duplicatedBindingId
            }
          })
        } else {
          // If only the fromId is selected, delete the binding on
          // the duplicated shape's handles
          const boundShape = after.shapes[duplicateMap[binding.fromId]]
          Object.values(boundShape!.handles!).forEach((handle) => {
            if (handle!.bindingId === binding.id) {
              handle!.bindingId = null
            }
          })
        }
      }
    })

  return {
    id: 'duplicate',
    before: {
      document: {
        pages: {
          [currentPageId]: before,
        },
        pageStates: {
          [currentPageId]: { selectedIds: ids },
        },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: after,
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: Array.from(dupedShapeIds.values()).map((id) => duplicateMap[id]),
          },
        },
      },
    },
  }
}
