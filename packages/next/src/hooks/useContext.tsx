import * as React from 'react'
import type { TLNuViewport } from '~lib'
import type { TLNuInputs } from '~lib/TLNuInputs'

export type NuContext = {
  viewport: TLNuViewport
  inputs: TLNuInputs
  callbacks: {
    onPan?: (delta: number[]) => void
  }
}

export const nuContext = React.createContext<NuContext>({} as NuContext)

export function useContext() {
  return React.useContext(nuContext)
}
