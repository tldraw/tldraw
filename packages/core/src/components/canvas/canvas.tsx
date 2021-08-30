import * as React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import {
  usePreventNavigation,
  useZoomEvents,
  useSafariFocusOutFix,
  useCanvasEvents,
  useCameraCss,
} from '+hooks'
import type { TLBinding, TLPage, TLPageState, TLShape } from '+types'
import { ErrorFallback } from '+components/error-fallback'
import { Brush } from '+components/brush'
import { Defs } from '+components/defs'
import { Page } from '+components/page'

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

export const Canvas = React.memo(function Canvas<T extends TLShape>({
  page,
  pageState,
  meta,
  hideHandles = false,
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
              hideHandles={hideHandles}
              meta={meta}
            />
            <Brush />
          </g>
        </ErrorBoundary>
      </svg>
    </div>
  )
})
