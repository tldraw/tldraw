import styled from 'styles'
import { ErrorBoundary } from 'react-error-boundary'
import state, { useSelector } from 'state'
import React, { useRef } from 'react'
import useZoomEvents from 'hooks/useZoomEvents'
import useCamera from 'hooks/useCamera'
import Defs from './defs'
import Page from './page'
import Brush from './brush'
import Bounds from './bounds/bounding-box'
import BoundsBg from './bounds/bounds-bg'
import Handles from './bounds/handles'
import useCanvasEvents from 'hooks/useCanvasEvents'
import ContextMenu from './context-menu/context-menu'

export default function Canvas(): JSX.Element {
  const rCanvas = useRef<SVGSVGElement>(null)
  const rGroup = useRef<SVGGElement>(null)

  useCamera(rGroup)

  useZoomEvents()

  const events = useCanvasEvents(rCanvas)

  const isReady = useSelector((s) => s.isIn('ready'))

  return (
    <ContextMenu>
      <MainSVG ref={rCanvas} {...events}>
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => {
            // reset the state of your app so the error doesn't happen again
          }}
        >
          <Defs />
          {isReady && (
            <g ref={rGroup} id="shapes">
              <BoundsBg />
              <Page />
              <Bounds />
              <Handles />
              <Brush />
            </g>
          )}
        </ErrorBoundary>
      </MainSVG>
    </ContextMenu>
  )
}

const MainSVG = styled('svg', {
  position: 'fixed',
  overflow: 'hidden',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  touchAction: 'none',
  zIndex: 100,
  backgroundColor: '$canvas',
  pointerEvents: 'all',
  // cursor: 'none',

  '& *': {
    userSelect: 'none',
  },
})

function ErrorFallback({ error, resetErrorBoundary }) {
  React.useEffect(() => {
    console.error(error)
    const copy = 'Sorry, something went wrong. Clear canvas and continue?'
    if (window.confirm(copy)) {
      state.send('CLEARED_PAGE')
      resetErrorBoundary()
    }
  }, [])

  return (
    <g>
      <text>Oops</text>
    </g>
  )
}
