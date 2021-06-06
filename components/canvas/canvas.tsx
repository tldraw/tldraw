import styled from 'styles'
import state, { useSelector } from 'state'
import inputs from 'state/inputs'
import React, { useCallback, useRef } from 'react'
import useZoomEvents from 'hooks/useZoomEvents'
import useCamera from 'hooks/useCamera'
import Defs from './defs'
import Page from './page'
import Brush from './brush'
import Bounds from './bounds/bounding-box'
import BoundsBg from './bounds/bounds-bg'
import Selected from './selected'
import Handles from './bounds/handles'
import { isMobile, screenToWorld, throttle } from 'utils/utils'
import session from 'state/session'
import { PointerInfo } from 'types'
import { fastDrawUpdate } from 'state/hacks'
import useCanvasEvents from 'hooks/useCanvasEvents'

export default function Canvas() {
  const rCanvas = useRef<SVGSVGElement>(null)
  const rGroup = useRef<SVGGElement>(null)

  useCamera(rGroup)

  useZoomEvents()

  const events = useCanvasEvents(rCanvas)

  const isReady = useSelector((s) => s.isIn('ready'))

  return (
    <MainSVG ref={rCanvas} {...events}>
      <Defs />
      {isReady && (
        <g ref={rGroup}>
          <BoundsBg />
          <Page />
          <Selected />
          <Bounds />
          <Handles />
          <Brush />
        </g>
      )}
    </MainSVG>
  )
}

const MainSVG = styled('svg', {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  touchAction: 'none',
  zIndex: 100,
  backgroundColor: '$canvas',
  pointerEvents: 'all',

  '& *': {
    userSelect: 'none',
  },
})

// const throttledPointerMove = throttle((payload: any) => {
//   state.send('MOVED_POINTER', payload)
// }, 16)

const throttledPointerMove = (payload: any) => {
  state.send('MOVED_POINTER', payload)
}
