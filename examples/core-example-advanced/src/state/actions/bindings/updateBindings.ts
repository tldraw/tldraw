import type { TLBinding } from '@tldraw/core'
import type { Action } from 'state/constants'

export const updateBindings: Action = (
  data,
  payload: { bindings: (Partial<TLBinding> & Pick<TLBinding, 'id'>)[] }
) => {
  try {
    payload.bindings.forEach((partial) => {
      Object.assign(data.page.bindings[partial.id], partial)
    })
  } catch (e: any) {
    e.message = 'Could not update shapes: ' + e.message
    console.error(e)
  }
}
