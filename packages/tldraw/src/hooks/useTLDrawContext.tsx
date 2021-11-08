import * as React from 'react'
import type { Data } from '~types'
import type { UseBoundStore } from 'zustand'
import type { TLDrawState } from '~state'

export interface TLDrawContextType {
  state: TLDrawState
  useSelector: UseBoundStore<Data>
}

export const TLDrawContext = React.createContext<TLDrawContextType>({} as TLDrawContextType)

export function useTLDrawContext() {
  const context = React.useContext(TLDrawContext)

  return context
}
