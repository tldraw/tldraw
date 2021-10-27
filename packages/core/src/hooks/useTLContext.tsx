import * as React from 'react'
import type { Inputs } from '+inputs'
import type { TLCallbacks, TLShape, TLBounds, TLPageState } from '+types'
import type { TLShapeUtilsMap } from '+shape-utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TLContextType<T extends TLShape> {
  id?: string
  callbacks: Partial<TLCallbacks<T>>
  shapeUtils: TLShapeUtilsMap<T>
  rPageState: React.MutableRefObject<TLPageState>
  rSelectionBounds: React.MutableRefObject<TLBounds | null>
  inputs: Inputs
}

export const TLContext = React.createContext({} as TLContextType<TLShape>)

export function useTLContext() {
  const context = React.useContext(TLContext)

  return context
}
