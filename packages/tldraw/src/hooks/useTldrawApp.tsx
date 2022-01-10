import * as React from 'react'
import type { TldrawApp } from '~state'

export const TldrawContext = React.createContext<TldrawApp>({} as TldrawApp)

export function useTldrawApp() {
  const context = React.useContext(TldrawContext)
  return context
}
