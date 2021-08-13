import * as React from 'react'
import type { Data } from '~types'
import type { UseStore } from 'zustand'
import type { TLDrawState } from '~state'

export interface TLDrawContextType {
  tlstate: TLDrawState
  useSelector: UseStore<Data>
}

export const TLDrawContext = React.createContext<TLDrawContextType>({} as TLDrawContextType)

export function useTLDrawContext() {
  const context = React.useContext(TLDrawContext)

  return context
}
