import * as React from 'react'
import type { BoxShape } from '~TLShapeUtil/TLShapeUtil.spec'
import { Inputs } from '~inputs'
import { useTLTheme, TLContext, TLContextType } from '../hooks'
import type { TLPageState, TLBounds } from '../types'
import { mockDocument } from './mockDocument'
import { mockUtils } from './mockUtils'

export const ContextWrapper = ({ children }: { children: any }) => {
  useTLTheme()
  const rSelectionBounds = React.useRef<TLBounds>(null)
  const rPageState = React.useRef<TLPageState>(mockDocument.pageState)

  const [context] = React.useState<TLContextType<BoxShape>>(() => ({
    callbacks: {},
    shapeUtils: mockUtils,
    rSelectionBounds,
    rPageState,
    inputs: new Inputs(),
    bounds: {
      minX: 0,
      minY: 0,
      maxX: Infinity,
      maxY: Infinity,
      width: Infinity,
      height: Infinity,
    },
  }))

  return <TLContext.Provider value={context as any}>{children}</TLContext.Provider>
}
