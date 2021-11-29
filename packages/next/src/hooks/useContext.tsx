import * as React from 'react'
import type { TLNuShape, TLNuViewport } from '~lib'
import type { TLNuInputs } from '~lib/TLNuInputs'
import type { TLNuCallbacks } from '~types'

export type NuContext<S extends TLNuShape = TLNuShape> = {
  viewport: TLNuViewport
  inputs: TLNuInputs
  callbacks: TLNuCallbacks<S>
}

export const nuContext = React.createContext<NuContext<any>>({} as NuContext<any>)

export function useContext() {
  return React.useContext(nuContext)
}
