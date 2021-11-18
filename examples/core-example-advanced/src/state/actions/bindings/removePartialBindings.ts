import type { Action } from 'state/constants'

// Remove bindings from selected shapes to shapes that aren't also selected
export const removePartialBindings: Action = (data) => {
  const { selectedIds } = data.pageState

  const bindings = Object.values(data.page.bindings)

  bindings
    .filter((binding) => selectedIds.includes(binding.fromId))
    .forEach((binding) => {
      if (!selectedIds.includes(binding.toId)) {
        delete data.page.bindings[binding.id]
      }
    })
}
