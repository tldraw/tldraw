import type { Action } from 'state/constants'

export const clearSnapLines: Action = (data) => {
  data.overlays.snapLines = []
}
