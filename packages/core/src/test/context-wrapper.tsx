import * as React from 'react'
import type { TLPageState, TLBounds } from '../types'
import { mockDocument } from './mockDocument'
import { mockUtils } from './mockUtils'
import { useTLTheme, TLContext, TLContextType } from '../hooks'
import { Inputs } from '~inputs'
import type { TLShape } from '~index'
import type { BoxShape } from '~shape-utils/TLShapeUtil.spec'

export const ContextWrapper: React.FC = ({ children }) => {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <TLContext.Provider value={context as any}>{children}</TLContext.Provider>
}
