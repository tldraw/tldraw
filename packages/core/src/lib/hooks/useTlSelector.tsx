import { useTLState } from './useTLState'
import { useSelector } from '@state-designer/react'
import { TLState } from '../state'
import { TLShape } from '../types'

export function useTlSelector<K>(
  callback: (state: TLState<TLShape>['state']) => K,
  compare?: (prev: K, next: K) => boolean
) {
  const tlstate = useTLState()

  return useSelector(tlstate.state, callback, compare)
}
