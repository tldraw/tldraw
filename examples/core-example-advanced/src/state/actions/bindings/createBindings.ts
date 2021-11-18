import type { TLBinding } from '@tldraw/core'
import { nanoid } from 'nanoid'
import type { Action, CustomBinding } from 'state/constants'

export const createBindings: Action = (
  data,
  payload: {
    bindings: (Partial<TLBinding> & Pick<CustomBinding, 'fromId' | 'toId' | 'handleId'>)[]
  }
) => {
  payload.bindings.forEach((partial) => {
    const binding = {
      id: nanoid(),
      ...partial,
    }

    data.page.bindings[binding.id] = binding
  })
}
