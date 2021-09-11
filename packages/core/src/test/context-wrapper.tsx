import * as React from 'react'
import type { TLPageState, TLBounds, TLShape } from '../types'
import { mockDocument } from './mockDocument'
import { mockUtils } from './mockUtils'
import { useTLTheme, TLContext, TLContextType } from '../hooks'
import { Inputs } from '+inputs'

export const ContextWrapper: React.FC = ({ children }) => {
  useTLTheme()
  const rScreenBounds = React.useRef<TLBounds>(null)
  const rPageState = React.useRef<TLPageState>(mockDocument.pageState)

  const [context] = React.useState(() => ({
    callbacks: {},
    shapeUtils: mockUtils,
    rScreenBounds,
    rPageState,
    inputs: new Inputs(),
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <TLContext.Provider value={context as any}>{children}</TLContext.Provider>
}
