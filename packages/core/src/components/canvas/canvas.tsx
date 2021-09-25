/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  usePreventNavigation,
  useZoomEvents,
  useSafariFocusOutFix,
  useCanvasEvents,
  useCameraCss,
  useKeyEvents,
  useShapeTree,
} from '+hooks'
import type { TLBinding, TLPage, TLPageState, TLShape } from '+types'
import { ErrorFallback } from '../error-fallback'
import { ErrorBoundary } from '../error-boundary'
import { Brush } from '../brush'
import { Page } from '../page'
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
  id?: string
}

export function Canvas<T extends TLShape, M extends Record<string, unknown>>({
  id,
  page,
  pageState,
  meta,
  hideHandles = false,
  hideBounds = false,
  hideIndicators = false,
}: CanvasProps<T, M>): JSX.Element {
  const rCanvas = React.useRef<HTMLDivElement>(null)
  const rLayer = React.useRef<HTMLDivElement>(null)

  useResizeObserver(rCanvas)

  useZoomEvents(rCanvas)

  useSafariFocusOutFix()

  usePreventNavigation(rCanvas)

  const events = useCanvasEvents()

  useCameraCss(rLayer, pageState.camera)

  const preventScrolling = React.useCallback((e: React.UIEvent<HTMLDivElement, UIEvent>) => {
    e.currentTarget.scrollTo(0, 0)
  }, [])

  useKeyEvents()

  const { shapeTree } = useShapeTree(page, pageState, meta)

  return (
    <div
      id="canvas"
      className="tl-absolute tl-canvas"
      ref={rCanvas}
      onScroll={preventScrolling}
      {...events}
    >
      <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetError}>
        <div ref={rLayer} className="tl-absolute tl-layer">
          <Page
            page={page}
            pageState={pageState}
            hideBounds={hideBounds}
            hideIndicators={hideIndicators}
            hideHandles={hideHandles}
            shapeTree={shapeTree}
            meta={meta}
          />
          {pageState.brush && <Brush brush={pageState.brush} />}
        </div>
        {/* <Minimap commonBounds={commonBounds} {...minimap} /> */}
      </ErrorBoundary>
    </div>
  )
}
