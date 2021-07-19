import * as Sentry from '@sentry/node'
import React, { useRef } from 'react'

import { ErrorBoundary } from 'react-error-boundary'
import state, { useSelector } from 'state'
import styled from 'styles'
import useCamera from 'hooks/useCamera'
import useCanvasEvents from 'hooks/useCanvasEvents'
import useZoomEvents from 'hooks/useZoomEvents'
import Bounds from './bounds/bounding-box'
import BoundsBg from './bounds/bounds-bg'
import Handles from './bounds/handles'
import ContextMenu from './context-menu/context-menu'
import Coop from './coop/coop'
import Brush from './brush'
import Defs from './defs'
import Page from './page'
import Binding from './binding'
import useSafariFocusOutFix from 'hooks/useSafariFocusOutFix'

function resetError() {
  null
}

export default function Canvas(): JSX.Element {
  const rCanvas = useRef<SVGSVGElement>(null)
  const rGroup = useRef<SVGGElement>(null)

  useCamera(rGroup)

  useZoomEvents()

  useSafariFocusOutFix()

  const events = useCanvasEvents(rCanvas)

  const isReady = useSelector((s) => s.isIn('ready'))

  return (
    <ContextMenu>
      <MainSVG id="canvas" ref={rCanvas} {...events}>
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetError}>
          <Defs />
          <g ref={rGroup} id="shapes" opacity={isReady ? 1 : 0}>
            <BoundsBg />
            <Page />
            <Coop />
            <Bounds />
            <Handles />
            <Brush />
            <Binding />
          </g>
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
  pointerEvents: 'all',
  backgroundColor: '$canvas',
  borderTop: '1px solid $border',
  borderBottom: '1px solid $border',

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
