import * as React from 'react'
import type { Inputs } from '+inputs'
import type { TLCallbacks, TLShape, TLBounds, TLPageState, TLShapeUtils } from '+types'

export interface TLContextType {
  id?: string
  callbacks: Partial<TLCallbacks>
  shapeUtils: TLShapeUtils<TLShape>
  rPageState: React.MutableRefObject<TLPageState>
  rScreenBounds: React.MutableRefObject<TLBounds | null>
  inputs: Inputs
}

export const TLContext = React.createContext<TLContextType>({} as TLContextType)

export function useTLContext() {
  const context = React.useContext(TLContext)

  return context
}
