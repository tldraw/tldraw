/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import type { TLNuShape, TLNuViewport } from '~nu-lib'
import type { TLNuInputs } from '~nu-lib/TLNuInputs'
import type { TLNuCallbacks, TLNuComponents } from '~types'

export type NuContext = {
  viewport: TLNuViewport
  inputs: TLNuInputs
  callbacks: Partial<TLNuCallbacks>
  components: Partial<TLNuComponents>
  meta: any
}

export const nuContext = React.createContext({} as NuContext)

export function useContext() {
  return React.useContext(nuContext)
}
