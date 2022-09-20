import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const addToHistory: Action = (data) => {
  mutables.history.push(data)
}
