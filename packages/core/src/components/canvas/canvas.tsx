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

interface CanvasProps<T extends TLShape> {
  page: TLPage<T, TLBinding>
  pageState: TLPageState
  hideBounds?: boolean
  hideHandles?: boolean
  hideIndicators?: boolean
  meta?: Record<string, unknown>
}

export function Canvas<T extends TLShape>({
  page,
  pageState,
  meta,
  hideHandles = false,
  hideBounds = false,
  hideIndicators = false,
}: CanvasProps<T>): JSX.Element {
  const rCanvas = React.useRef<SVGSVGElement>(null)
  const rContainer = React.useRef<HTMLDivElement>(null)
  const rGroup = useCameraCss(pageState)

  useZoomEvents(rCanvas)

  useSafariFocusOutFix()

  usePreventNavigation(rCanvas)

  const events = useCanvasEvents()

  useResizeObserver(rCanvas)

  return (
    <div className="tl-container" ref={rContainer}>
      <svg id="canvas" className="tl-canvas" ref={rCanvas} {...events}>
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetError}>
          <Defs zoom={pageState.camera.zoom} />
          <g ref={rGroup} id="tl-shapes">
            <Page
              page={page}
              pageState={pageState}
              hideBounds={hideBounds}
              hideIndicators={hideIndicators}
              hideHandles={hideHandles}
              meta={meta}
            />
            <Brush />
          </g>
        </ErrorBoundary>
      </svg>
    </div>
  )
}
