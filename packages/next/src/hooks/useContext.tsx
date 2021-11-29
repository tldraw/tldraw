import * as React from 'react'
import type { TLNuViewport } from '~lib'
import type { TLNuInputs } from '~lib/TLNuInputs'
import type { TLNuCallbacks } from '~types'

export type NuContext = {
  viewport: TLNuViewport
  inputs: TLNuInputs
  callbacks: TLNuCallbacks
}

export const nuContext = React.createContext<NuContext>({} as NuContext)

export function useContext() {
  return React.useContext(nuContext)
}
