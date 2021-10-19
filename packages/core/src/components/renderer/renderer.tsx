/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import type {
  TLShape,
  TLPage,
  TLPageState,
  TLCallbacks,
  TLTheme,
  TLBounds,
  TLBinding,
} from '../../types'
import { Canvas } from '../canvas'
import { Inputs } from '../../inputs'
import { useTLTheme, TLContext, TLContextType } from '../../hooks'
import type { TLShapeUtil, TLSnapLine, TLUsers } from '+index'

export interface RendererProps<T extends TLShape, E extends Element = any, M = any>
  extends Partial<TLCallbacks<T>> {
  /**
   * (optional) A unique id to be applied to the renderer element, used to scope styles.
   */
  id?: string
  /**
   * (optional) A ref for the renderer's container element, used for scoping event handlers.
   */
  containerRef?: React.RefObject<HTMLElement>
  /**
   * An object containing instances of your shape classes.
   */
  shapeUtils: Record<T['type'], TLShapeUtil<T, E, M>>
  /**
   * The current page, containing shapes and bindings.
   */
  page: TLPage<T, TLBinding>
  /**
   * The current page state.
   */
  pageState: TLPageState
  /**
   * (optional) The current users to render.
   */
  users?: TLUsers<T>
  /**
   * (optional) The current snap lines to render.
   */
  snapLines?: TLSnapLine[]
  /**
   * (optional) The current user's id, used to identify the user.
   */
  userId?: string
  /**
   * (optional) An object of custom theme colors.
   */
  theme?: Partial<TLTheme>
  /**
   * (optional) When true, the renderer will not show the bounds for selected objects.
   */
  hideBounds?: boolean
  /**
   * (optional) When true, the renderer will not show the handles of shapes with handles.
   */
  hideHandles?: boolean
  /**
   * (optional) When true, the renderer will not show rotate handles for selected objects.
   */
  hideRotateHandles?: boolean
  /**
   * (optional) When true, the renderer will not show buttons for cloning shapes.
   */
  hideCloneHandles?: boolean
  /**
   * (optional) When true, the renderer will not show binding controls.
   */
  hideBindingHandles?: boolean
  /**
   * (optional) When true, the renderer will not show indicators for selected or
   * hovered objects,
   */
  hideIndicators?: boolean
  /**
   * (optional) hen true, the renderer will ignore all inputs that were not made
   * by a stylus or pen-type device.
   */
  isPenMode?: boolean
  /**
   * (optional) An object of custom options that should be passed to rendered shapes.
   */
  meta?: M
  /**
   * (optional) A callback that receives the renderer's inputs manager.
   */
  onMount?: (inputs: Inputs) => void
  /**
   * (optional) A callback that is fired when the editor's client bounding box changes.
   */
  onBoundsChange?: (bounds: TLBounds) => void
}

/**
 * The Renderer component is the main component of the library. It
 * accepts the current `page`, the `shapeUtils` needed to interpret
 * and render the shapes and bindings on the `page`, and the current
 * `pageState`.
 * @param props
 * @returns
 */
export function Renderer<T extends TLShape, E extends Element, M extends Record<string, unknown>>({
  id = 'tl',
  shapeUtils,
  page,
  pageState,
  users,
  userId,
  theme,
  meta,
  snapLines,
  containerRef,
  hideHandles = false,
  hideIndicators = false,
  hideCloneHandles = false,
  hideBindingHandles = false,
  hideRotateHandles = false,
  hideBounds = false,
  onMount,
  ...rest
}: RendererProps<T, E, M>): JSX.Element {
  useTLTheme(theme, '#' + id)

  const rSelectionBounds = React.useRef<TLBounds>(null)

  const rPageState = React.useRef<TLPageState>(pageState)

  React.useEffect(() => {
    rPageState.current = pageState
  }, [pageState])

  const [context] = React.useState<TLContextType<T, E, M>>(() => ({
    callbacks: rest,
    shapeUtils,
    rSelectionBounds,
    rPageState,
    inputs: new Inputs(),
  }))

  React.useEffect(() => {
    onMount?.(context.inputs)
  }, [context])

  return (
    <TLContext.Provider value={context as unknown as TLContextType<TLShape, Element>}>
      <Canvas
        id={id}
        page={page}
        pageState={pageState}
        snapLines={snapLines}
        users={users}
        userId={userId}
        externalContainerRef={containerRef}
        hideBounds={hideBounds}
        hideIndicators={hideIndicators}
        hideHandles={hideHandles}
        hideCloneHandles={hideCloneHandles}
        hideBindingHandles={hideBindingHandles}
        hideRotateHandle={hideRotateHandles}
        meta={meta}
      />
    </TLContext.Provider>
  )
}
