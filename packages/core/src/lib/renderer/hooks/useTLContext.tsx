import * as React from 'react'
import { TLCallbacks, TLShape, TLShapeUtils } from '../../types'

export interface TLContextType {
  callbacks: Partial<TLCallbacks>
  shapeUtils: TLShapeUtils<TLShape>
}

export const TLContext = React.createContext<TLContextType>({} as TLContextType)

export function useTLContext() {
  const context = React.useContext(TLContext)

  return context
}
