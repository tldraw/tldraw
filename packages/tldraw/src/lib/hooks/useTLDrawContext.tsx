import * as React from 'react'
import { Data } from '../state2/state-types'
import { UseStore } from 'zustand'
import { TLDrawState } from '../state2'

export interface TLDrawContextType {
  tlstate: TLDrawState
  useAppState: UseStore<Data>
}

export const TLDrawContext = React.createContext<TLDrawContextType>({} as TLDrawContextType)

export function useTLDrawContext() {
  const context = React.useContext(TLDrawContext)

  return context
}
