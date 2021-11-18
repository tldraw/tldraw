import type { Action } from 'state/constants'

export const clearSnaplines: Action = (data) => {
  data.overlays.snapLines = []
}
