import { ErrorBoundary } from 'react-error-boundary'
import * as React from 'react'
import {
  useTLContext,
  useZoomEvents,
  useSafariFocusOutFix,
  useCanvasEvents,
  useCameraCss,
} from '../hooks'
import { ErrorFallback } from './error-fallback'
import { TLPage, TLPageState, TLShape, TLShapeUtils } from '../../types'

// import Bounds from './bounds/bounding-box'
// import BoundsBg from './bounds/bounds-bg'
// import Handles from './bounds/handles'
// import Coop from './coop/coop'
// import Brush from './brush'
import { Defs } from './defs'
import { Page } from './page'
// import Binding from './binding'

function resetError() {
  // todo
}

interface CanvasProps<T extends TLShape> {
  page: TLPage<T>
  pageState: TLPageState
}

export function Canvas<T extends TLShape>({
  page,
  pageState,
}: CanvasProps<T>): JSX.Element {
  const rCanvas = React.useRef<SVGSVGElement>(null)

  const rGroup = useCameraCss(pageState)

  useZoomEvents()

  useSafariFocusOutFix()

  const events = useCanvasEvents(rCanvas)

  return (
    <div className="tl-container">
      <svg id="canvas" className="tl-canvas" ref={rCanvas} {...events}>
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetError}>
          <Defs zoom={pageState.camera.zoom} />
          <g ref={rGroup} id="tl-shapes">
            {/* <BoundsBg /> */}
            <Page page={page} pageState={pageState} />
            {/*  <Coop />
            <Bounds />
            <Handles />
            <Brush />
            <Binding /> */}
            <use href="#dot" />
          </g>
        </ErrorBoundary>
      </svg>
    </div>
  )
}
