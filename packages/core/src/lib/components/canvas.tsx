import { ErrorBoundary } from 'react-error-boundary'
import * as React from 'react'
import {
  useTLState,
  useZoomEvents,
  useCamera,
  useSafariFocusOutFix,
  useCanvasEvents,
  useTlSelector,
} from '../hooks'
import styled from '../styles'

// import Bounds from './bounds/bounding-box'
// import BoundsBg from './bounds/bounds-bg'
// import Handles from './bounds/handles'
// import ContextMenu from './context-menu/context-menu'
// import Coop from './coop/coop'
// import Brush from './brush'
import Defs from './defs'
import Page from './page'
// import Binding from './binding'

function resetError() {
  // todo
}

export function Canvas(): JSX.Element {
  const rCanvas = React.useRef<SVGSVGElement>(null)
  const rGroup = React.useRef<SVGGElement>(null)

  useCamera(rGroup)

  useZoomEvents()

  useSafariFocusOutFix()

  const events = useCanvasEvents(rCanvas)

  const isReady = useTlSelector((s) => s.isIn('ready'))

  return (
    // <ContextMenu>
    <MainSVG id="canvas" ref={rCanvas} {...events}>
      <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetError}>
        <Defs />
        <g ref={rGroup} id="shapes" opacity={isReady ? 1 : 0}>
          {/* <BoundsBg /> */}
          <Page />
          {/*  <Coop />
            <Bounds />
            <Handles />
            <Brush />
            <Binding /> */}
          <rect x={0} y={0} width={64} height={64} opacity={0.1} />
        </g>
      </ErrorBoundary>
    </MainSVG>
    // </ContextMenu>
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

function ErrorFallback({ error, resetErrorBoundary }: any) {
  const state = useTLState()

  React.useEffect(() => {
    const copy =
      'Sorry, something went wrong. Press Ok to reset the document, or press cancel to continue and see if it resolves itself.'

    console.error(error)

    // Sentry.captureException(error)

    if (window.confirm(copy)) {
      state.send('RESET_DOCUMENT_STATE')
      resetErrorBoundary()
    }
  }, [error, resetErrorBoundary, state])

  return <g />
}
