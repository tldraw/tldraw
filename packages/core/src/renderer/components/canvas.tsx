import * as React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import {
  useZoomEvents,
  useSafariFocusOutFix,
  useCanvasEvents,
  useCameraCss,
} from '../hooks'
import { ErrorFallback } from './error-fallback'
import type { TLPage, TLPageState, TLShape } from '../../types'

import { Brush } from './brush'
import { Defs } from './defs'
import { Page } from './page'
import { usePreventNavigation } from '../hooks/usePreventNavigation'

function resetError() {
  void null
}

interface CanvasProps<T extends TLShape> {
  page: TLPage<T>
  pageState: TLPageState
  hideBounds?: boolean
  hideIndicators?: boolean
}

export const Canvas = React.memo(function Canvas<T extends TLShape>({
  page,
  pageState,
  hideBounds = false,
  hideIndicators = false,
}: CanvasProps<T>): JSX.Element {
  const rCanvas = React.useRef<SVGSVGElement>(null)

  const rGroup = useCameraCss(pageState)

  useZoomEvents()

  useSafariFocusOutFix()

  usePreventNavigation(rCanvas)

  const events = useCanvasEvents()

  return (
    <div className="tl-container">
      <svg id="canvas" className="tl-canvas" ref={rCanvas} {...events}>
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetError}>
          <Defs zoom={pageState.camera.zoom} />
          <g ref={rGroup} id="tl-shapes">
            <Page
              page={page}
              pageState={pageState}
              hideBounds={hideBounds}
              hideIndicators={hideIndicators}
            />
            <Brush />
          </g>
        </ErrorBoundary>
      </svg>
    </div>
  )
})
