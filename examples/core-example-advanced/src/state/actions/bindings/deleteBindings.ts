import type { Action } from 'state/constants'

export const deleteBindings: Action = (data, payload: { ids: string[] }) => {
  try {
    payload.ids.forEach((id) => {
      delete data.page.bindings[id]
    })
  } catch (e: any) {
    e.message = 'Could not delete bindings: ' + e.message
    console.error(e)
  }
}
