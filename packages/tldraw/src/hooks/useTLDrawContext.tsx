import * as React from 'react'
import type { Data } from '~types'
import type { UseBoundStore } from 'zustand'
import type { TLDrawState } from '~state'

export interface TLDrawContextType {
  tlstate: TLDrawState
  useSelector: UseBoundStore<Data>
  callbacks: {
    onNewProject?: (tlstate: TLDrawState, event?: KeyboardEvent) => void
    onSaveProject?: (tlstate: TLDrawState, event?: KeyboardEvent) => void
    onSaveProjectAs?: (tlstate: TLDrawState, event?: KeyboardEvent) => void
    onOpenProject?: (tlstate: TLDrawState, event?: KeyboardEvent) => void
    onSignOut?: (tlstate: TLDrawState) => void
  }
}

export const TLDrawContext = React.createContext<TLDrawContextType>({} as TLDrawContextType)

export function useTLDrawContext() {
  const context = React.useContext(TLDrawContext)

  return context
}
