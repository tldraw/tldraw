/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Utils, Vec } from '@tldraw/core'
import { TLDR } from '~state/tldr'
import type { Data, PagePartial, TLDrawCommand } from '~types'

export function duplicate(data: Data, ids: string[]): TLDrawCommand {
  const { currentPageId } = data.appState

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

  const cloneMap: Record<string, string> = {}

  shapes.forEach((shape) => {
    const id = Utils.uniqueId()
    before.shapes[id] = undefined
    after.shapes[id] = {
      ...Utils.deepClone(shape),
      id,
      point: Vec.round(Vec.add(shape.point, delta)),
    }
    cloneMap[shape.id] = id
  })

  const page = TLDR.getPage(data, currentPageId)

  Object.values(page.bindings).forEach((binding) => {
    if (ids.includes(binding.fromId)) {
      if (ids.includes(binding.toId)) {
        // If the binding is between two duplicating shapes then
        // duplicate the binding, too
        const duplicatedBindingId = Utils.uniqueId()

        const duplicatedBinding = {
          ...Utils.deepClone(binding),
          id: duplicatedBindingId,
          fromId: cloneMap[binding.fromId],
          toId: cloneMap[binding.toId],
        }

        before.bindings[duplicatedBindingId] = undefined
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
        const boundShape = after.shapes[cloneMap[binding.fromId]]
        Object.values(boundShape!.handles!).forEach((handle) => {
          if (handle!.bindingId === binding.id) {
            handle!.bindingId = undefined
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
          [currentPageId]: { selectedIds: Object.keys(after.shapes) },
        },
      },
    },
  }
}
