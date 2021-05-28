import styled from 'styles'
import state from 'state'
import inputs from 'state/inputs'
import React, { useCallback, useRef } from 'react'
import useZoomEvents from 'hooks/useZoomEvents'
import useCamera from 'hooks/useCamera'
import Defs from './defs'
import Page from './page'
import Brush from './brush'
import Bounds from './bounds/bounding-box'
import BoundsBg from './bounds/bounds-bg'

export default function Canvas() {
  const rCanvas = useRef<SVGSVGElement>(null)
  const rGroup = useRef<SVGGElement>(null)
  const events = useZoomEvents(rCanvas)

  useCamera(rGroup)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    rCanvas.current.setPointerCapture(e.pointerId)
    state.send('POINTED_CANVAS', inputs.pointerDown(e, 'canvas'))
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    state.send('MOVED_POINTER', inputs.pointerMove(e))
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    rCanvas.current.releasePointerCapture(e.pointerId)
    state.send('STOPPED_POINTING', { id: 'canvas', ...inputs.pointerUp(e) })
  }, [])

  return (
    <MainSVG
      ref={rCanvas}
      {...events}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <Defs />
      <MainGroup ref={rGroup}>
        <BoundsBg />
        <Page />
        <Bounds />
        <Brush />
      </MainGroup>
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

  '& *': {
    userSelect: 'none',
  },
})

const MainGroup = styled('g', {})
