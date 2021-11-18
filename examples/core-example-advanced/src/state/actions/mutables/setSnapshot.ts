import { current } from 'immer'
import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const setSnapshot: Action = (data) => {
  mutables.snapshot = current(data)
}
