import type { Action } from 'state/constants'

export const clearBrush: Action = (data) => {
  data.pageState.brush = undefined
}
