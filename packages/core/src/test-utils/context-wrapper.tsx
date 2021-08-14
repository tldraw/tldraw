import * as React from 'react'
import type { TLPageState, TLBounds } from '../types'
import { mockDocument } from './mockDocument'
import { mockUtils } from './mockUtils'
import { useTLTheme, TLContext } from '../hooks'

export const ContextWrapper: React.FC = ({ children }) => {
  useTLTheme()
  const rScreenBounds = React.useRef<TLBounds>(null)
  const rPageState = React.useRef<TLPageState>(mockDocument.pageState)

  const [context] = React.useState(() => ({
    callbacks: {},
    shapeUtils: mockUtils,
    rScreenBounds,
    rPageState,
  }))

  return <TLContext.Provider value={context}>{children}</TLContext.Provider>
}
