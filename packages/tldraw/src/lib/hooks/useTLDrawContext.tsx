import * as React from 'react'
import { Data } from '../state/state-types'
import { UseStore } from 'zustand'
import { TLDrawState } from '../state'

export interface TLDrawContextType {
  tlstate: TLDrawState
  useAppState: UseStore<Data>
}

export const TLDrawContext = React.createContext<TLDrawContextType>({} as TLDrawContextType)

export function useTLDrawContext() {
  const context = React.useContext(TLDrawContext)

  return context
}
