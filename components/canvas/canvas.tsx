import * as Sentry from '@sentry/node'
import { ErrorBoundary } from 'react-error-boundary'
import Bounds from './bounds/bounding-box'
import BoundsBg from './bounds/bounds-bg'
import Brush from './brush'
import ContextMenu from './context-menu/context-menu'
import Coop from './coop/coop'
import Defs from './defs'
import Handles from './bounds/handles'
import Page from './page'
import React, { useRef } from 'react'
import state, { useSelector } from 'state'
import styled from 'styles'
import useCamera from 'hooks/useCamera'
import useCanvasEvents from 'hooks/useCanvasEvents'
import useZoomEvents from 'hooks/useZoomEvents'

function resetError() {
  null
}

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
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetError}>
          <Defs />
          {isReady && (
            <g ref={rGroup} id="shapes">
              <BoundsBg />
              <Page />
              <Coop />
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
    const copy =
      'Sorry, something went wrong. Press Ok to reset the document, or press cancel to continue and see if it resolves itself.'

    console.error(error)

    Sentry.captureException(error)

    if (window.confirm(copy)) {
      state.send('RESET_DOCUMENT_STATE')
      resetErrorBoundary()
    }
  }, [])

  return <g />
}
