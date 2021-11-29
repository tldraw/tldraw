import * as React from 'react'

export type NuContext = {
  callbacks: {
    onPan?: (delta: number[]) => void
  }
}

export const nuContext = React.createContext<NuContext>({} as NuContext)

export function useContext() {
  return React.useContext(nuContext)
}
