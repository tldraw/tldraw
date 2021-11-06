import * as React from 'react'
import type { Data } from '~types'
import type { UseBoundStore } from 'zustand'
import type { TLDrawState } from '~state'

export interface TLDrawContextType {
  tlstate: TLDrawState
  useSelector: UseBoundStore<Data>
  callbacks: {
    onNewProject?: (tlstate: TLDrawState) => void
    onSaveProject?: (tlstate: TLDrawState) => void
    onSaveProjectAs?: (tlstate: TLDrawState) => void
    onOpenProject?: (tlstate: TLDrawState) => void
    onSignIn?: (tlstate: TLDrawState) => void
    onSignOut?: (tlstate: TLDrawState) => void
  }
}

export const TLDrawContext = React.createContext<TLDrawContextType>({} as TLDrawContextType)

export function useTLDrawContext() {
  const context = React.useContext(TLDrawContext)

  return context
}
