import * as React from 'react'
import type {
  TLShape,
  TLPage,
  TLPageState,
  TLCallbacks,
  TLShapeUtils,
  TLTheme,
  TLBounds,
  TLBinding,
} from '../../types'
import { Canvas } from '../canvas'
import { Inputs } from '../../inputs'
import { useTLTheme, TLContext, TLContextType } from '../../hooks'

export interface RendererProps<T extends TLShape, M extends Record<string, unknown>>
  extends Partial<TLCallbacks> {
  /**
   * An object containing instances of your shape classes.
   */
  shapeUtils: TLShapeUtils<T>
  /**
   * The current page, containing shapes and bindings.
   */
  page: TLPage<T, TLBinding>
  /**
   * The current page state.
   */
  pageState: TLPageState
  /**
   * An object of custom theme colors.
   */
  theme?: Partial<TLTheme>
  /**
   * When true, the renderer will not show the bounds for selected objects.
   */
  hideBounds?: boolean
  /**
   * When true, the renderer will not show the handles of shapes with handles.
   */
  hideHandles?: boolean
  /**
   * When true, the renderer will not show indicators for selected or
   * hovered objects,
   */
  hideIndicators?: boolean
  /**
   * When true, the renderer will ignore all inputs that were not made
   * by a stylus or pen-type device.
   */
  isPenMode?: boolean
  /**
   * An object of custom options that should be passed to rendered shapes.
   */
  meta?: M
}

/**
 * The Renderer component is the main component of the library. It
 * accepts the current `page`, the `shapeUtils` needed to interpret
 * and render the shapes and bindings on the `page`, and the current
 * `pageState`.
 * @param props
 * @returns
 */
export function Renderer<T extends TLShape, M extends Record<string, unknown>>({
  shapeUtils,
  page,
  pageState,
  theme,
  meta,
  hideHandles = false,
  hideIndicators = false,
  hideBounds = false,
  ...rest
}: RendererProps<T, M>): JSX.Element {
  useTLTheme(theme)

  const rScreenBounds = React.useRef<TLBounds>(null)
  const rPageState = React.useRef<TLPageState>(pageState)

  React.useEffect(() => {
    rPageState.current = pageState
  }, [pageState])

  const [context] = React.useState<TLContextType>(() => ({
    callbacks: rest,
    shapeUtils,
    rScreenBounds,
    rPageState,
    inputs: new Inputs(),
  }))

  return (
    <TLContext.Provider value={context}>
      <Canvas
        page={page}
        pageState={pageState}
        hideBounds={hideBounds}
        hideIndicators={hideIndicators}
        hideHandles={hideHandles}
        meta={meta}
      />
    </TLContext.Provider>
  )
}
