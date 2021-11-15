import * as React from 'react'
import type { TLDrawSnapshot } from '~types'
import type { UseBoundStore } from 'zustand'
import type { TLDrawApp } from '~state'

export interface TLDrawContextType {
  state: TLDrawApp
  useSelector: UseBoundStore<TLDrawSnapshot>
}

export const TLDrawContext = React.createContext<TLDrawContextType>({} as TLDrawContextType)

export function useTLDrawContext() {
  const context = React.useContext(TLDrawContext)

  return context
}
