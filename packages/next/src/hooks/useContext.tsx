import * as React from 'react'
import type { TLNuShape, TLNuViewport } from '~nu-lib'
import type { TLNuInputs } from '~nu-lib/TLNuInputs'
import type { TLNuCallbacks, TLNuComponents } from '~types'

export type NuContext<S extends TLNuShape = TLNuShape> = {
  viewport: TLNuViewport
  inputs: TLNuInputs
  callbacks: TLNuCallbacks<S>
  components: TLNuComponents<S>
  meta: any
}

export const nuContext = React.createContext<NuContext<any>>({} as NuContext<any>)

export function useContext() {
  return React.useContext(nuContext)
}
