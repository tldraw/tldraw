/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  usePreventNavigation,
  useZoomEvents,
  useSafariFocusOutFix,
  useCanvasEvents,
  useCameraCss,
} from '+hooks'
import type { TLBinding, TLPage, TLPageState, TLShape } from '+types'
import { ErrorFallback } from '+components/error-fallback'
import { ErrorBoundary } from '+components/error-boundary'
import { Brush } from '+components/brush'
import { Defs } from '+components/defs'
import { Page } from '+components/page'
import { useResizeObserver } from '+hooks/useResizeObserver'

function resetError() {
  void null
}

interface CanvasProps<T extends TLShape, M extends Record<string, unknown>> {
  page: TLPage<T, TLBinding>
  pageState: TLPageState
  hideBounds?: boolean
  hideHandles?: boolean
  hideIndicators?: boolean
  meta?: M
}

export function Canvas<T extends TLShape, M extends Record<string, unknown>>({
  page,
  pageState,
  meta,
  hideHandles = false,
  hideBounds = false,
  hideIndicators = false,
}: CanvasProps<T, M>): JSX.Element {
  const rCanvas = React.useRef<HTMLDivElement>(null)
  const rContainer = React.useRef<HTMLDivElement>(null)

  useResizeObserver(rCanvas)

  useZoomEvents(rCanvas)

  useSafariFocusOutFix()

  usePreventNavigation(rCanvas)

  const events = useCanvasEvents()

  const rLayer = useCameraCss(rContainer, pageState)

  return (
    <div className="tl-container" ref={rContainer}>
      <div id="canvas" className="tl-absolute tl-canvas" ref={rCanvas} {...events}>
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetError}>
          {/* <Defs zoom={pageState.camera.zoom} /> */}
          <div ref={rLayer} className="tl-absolute tl-layer">
            <Page
              page={page}
              pageState={pageState}
              hideBounds={hideBounds}
              hideIndicators={hideIndicators}
              hideHandles={hideHandles}
              meta={meta}
            />
            <Brush />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  )
}
