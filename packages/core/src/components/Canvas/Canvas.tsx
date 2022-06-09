/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import {
  usePreventNavigationCss,
  useZoomEvents,
  useSafariFocusOutFix,
  useCanvasEvents,
  useCameraCss,
  useKeyEvents,
  usePerformanceCss,
} from '~hooks'
import type {
  TLAssets,
  TLBinding,
  TLBounds,
  TLPage,
  TLPageState,
  TLPerformanceMode,
  TLShape,
  TLSnapLine,
  TLUsers,
} from '~types'
import { Brush } from '~components/Brush'
import { Page } from '~components/Page'
import { Users } from '~components/Users'
import { useResizeObserver } from '~hooks/useResizeObserver'
import { inputs } from '~inputs'
import { UsersIndicators } from '~components/UsersIndicators'
import { SnapLines } from '~components/SnapLines/SnapLines'
import { Grid } from '~components/Grid'
import { Overlay } from '~components/Overlay'
import { EraseLine } from '~components/EraseLine'

interface CanvasProps<T extends TLShape, M extends Record<string, unknown>> {
  page: TLPage<T, TLBinding>
  pageState: TLPageState
  assets: TLAssets
  snapLines?: TLSnapLine[]
  eraseLine?: number[][]
  users?: TLUsers<T>
  userId?: string
  hideBounds: boolean
  hideHandles: boolean
  hideIndicators: boolean
  hideBindingHandles: boolean
  hideCloneHandles: boolean
  hideResizeHandles: boolean
  hideRotateHandle: boolean
  showDashedBrush: boolean
  externalContainerRef?: React.RefObject<HTMLElement>
  performanceMode?: TLPerformanceMode
  meta?: M
  id?: string
  onBoundsChange: (bounds: TLBounds) => void
}

export const Canvas = observer(function _Canvas<
  T extends TLShape,
  M extends Record<string, unknown>
>({
  id,
  page,
  pageState,
  assets,
  snapLines,
  eraseLine,
  users,
  userId,
  meta,
  performanceMode,
  externalContainerRef,
  showDashedBrush,
  hideHandles,
  hideBounds,
  hideIndicators,
  hideBindingHandles,
  hideCloneHandles,
  hideResizeHandles,
  hideRotateHandle,
  onBoundsChange,
}: CanvasProps<T, M>) {
  const rCanvas = React.useRef<HTMLDivElement>(null)

  const rZoomRef = React.useRef(pageState.camera.zoom)

  rZoomRef.current = pageState.camera.zoom

  useZoomEvents(rZoomRef, externalContainerRef || rCanvas)

  useResizeObserver(rCanvas, onBoundsChange)

  useSafariFocusOutFix()

  usePreventNavigationCss(rCanvas)

  const rContainer = React.useRef<HTMLDivElement>(null)

  const rLayer = React.useRef<HTMLDivElement>(null)

  useCameraCss(rLayer, rContainer, pageState)

  usePerformanceCss(performanceMode, rContainer)

  useKeyEvents()

  const events = useCanvasEvents()

  return (
    <div id={id} className="tl-container" ref={rContainer}>
      <div id="canvas" className="tl-absolute tl-canvas" ref={rCanvas} {...events}>
        {page.gridType && page.gridSize && <Grid size={page.gridSize} camera={pageState.camera} type={page.gridType} subgrid={page.showSubgrid}/>}
        <div ref={rLayer} className="tl-absolute tl-layer" data-testid="layer">
          <Page
            page={page}
            pageState={pageState}
            assets={assets}
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
          {pageState.brush && (
            <Brush brush={pageState.brush} dashed={showDashedBrush} zoom={pageState.camera.zoom} />
          )}
          {users && <Users userId={userId} users={users} />}
        </div>
        <Overlay camera={pageState.camera}>
          {eraseLine && <EraseLine points={eraseLine} zoom={pageState.camera.zoom} />}
          {snapLines && <SnapLines snapLines={snapLines} />}
        </Overlay>
      </div>
    </div>
  )
})
