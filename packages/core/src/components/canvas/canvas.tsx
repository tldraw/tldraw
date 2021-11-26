/* eslint-disable @typescript-eslint/no-explicit-any */
import { useObserver } from 'mobx-react-lite'
import * as React from 'react'
import {
  usePreventNavigation,
  useZoomEvents,
  useSafariFocusOutFix,
  useCanvasEvents,
  useCameraCss,
  useKeyEvents,
} from '~hooks'
import type { TLBinding, TLBounds, TLPage, TLPageState, TLShape, TLSnapLine, TLUsers } from '~types'
import { ErrorFallback } from '~components/error-fallback'
import { ErrorBoundary } from '~components/error-boundary'
import { Brush } from '~components/brush'
import { Page } from '~components/page'
import { Users } from '~components/users'
import { useResizeObserver } from '~hooks/useResizeObserver'
import { inputs } from '~inputs'
import { UsersIndicators } from '~components/users-indicators'
import { SnapLines } from '~components/snap-lines/snap-lines'
import { Overlay } from '~components/overlay'

function resetError() {
  void null
}

interface CanvasProps<T extends TLShape, M extends Record<string, unknown>> {
  page: TLPage<T, TLBinding>
  pageState: TLPageState
  snapLines?: TLSnapLine[]
  users?: TLUsers<T>
  userId?: string
  hideBounds: boolean
  hideHandles: boolean
  hideIndicators: boolean
  hideBindingHandles: boolean
  hideCloneHandles: boolean
  hideResizeHandles: boolean
  hideRotateHandle: boolean
  externalContainerRef?: React.RefObject<HTMLElement>
  meta?: M
  id?: string
  onBoundsChange: (bounds: TLBounds) => void
}

export function Canvas<T extends TLShape, M extends Record<string, unknown>>({
  id,
  page,
  pageState,
  snapLines,
  users,
  userId,
  meta,
  externalContainerRef,
  hideHandles,
  hideBounds,
  hideIndicators,
  hideBindingHandles,
  hideCloneHandles,
  hideResizeHandles,
  hideRotateHandle,
  onBoundsChange,
}: CanvasProps<T, M>): JSX.Element {
  return useObserver(() => {
    const rCanvas = React.useRef<HTMLDivElement>(null)
    const rContainer = React.useRef<HTMLDivElement>(null)
    const rLayer = React.useRef<HTMLDivElement>(null)

    inputs.zoom = pageState.camera.zoom

    useResizeObserver(rCanvas, onBoundsChange)

    useZoomEvents(pageState.camera.zoom, externalContainerRef || rCanvas)

    useSafariFocusOutFix()

    usePreventNavigation(rCanvas)

    useCameraCss(rLayer, rContainer, pageState)

    useKeyEvents()

    const events = useCanvasEvents()

    return (
      <div id={id} className="tl-container" ref={rContainer}>
        <div id="canvas" className="tl-absolute tl-canvas" ref={rCanvas} {...events}>
          <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetError}>
            <div ref={rLayer} className="tl-absolute tl-layer">
              <Page
                page={page}
                pageState={pageState}
                hideBounds={hideBounds}
                hideIndicators={hideIndicators}
                hideHandles={hideHandles}
                hideBindingHandles={hideBindingHandles}
                hideCloneHandles={hideCloneHandles}
                hideResizeHandles={hideResizeHandles}
                hideRotateHandle={hideRotateHandle}
                meta={meta}
              />
              {users && userId && (
                <UsersIndicators userId={userId} users={users} page={page} meta={meta} />
              )}
              {pageState.brush && <Brush brush={pageState.brush} />}
              {users && <Users userId={userId} users={users} />}
            </div>
          </ErrorBoundary>
          <Overlay camera={pageState.camera}>
            {snapLines && <SnapLines snapLines={snapLines} />}
          </Overlay>
        </div>
      </div>
    )
  })
}
