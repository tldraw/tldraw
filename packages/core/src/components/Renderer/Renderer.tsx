import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { Canvas } from '~/components/Canvas'
import type { TLShapeUtilsMap } from '~TLShapeUtil'
import { TLContext, TLContextType, useTLTheme } from '~hooks'
import { Inputs } from '~inputs'
import type {
  TLAssets,
  TLBinding,
  TLBounds,
  TLCallbacks,
  TLPage,
  TLPageState,
  TLPerformanceMode,
  TLShape,
  TLSnapLine,
  TLTheme,
  TLUsers,
} from '~types'

export interface RendererProps<T extends TLShape, M = any> extends Partial<TLCallbacks<T>> {
  /**
   * An object containing instances of your shape classes.
   */
  shapeUtils: TLShapeUtilsMap<T>
  /**
   * The current page, containing shapes and bindings.
   */
  page: TLPage<T, TLBinding>
  /**
   * The current page state.
   */
  pageState: TLPageState
  /**
   * A map of assets to be used in the renderer.
   */
  assets?: TLAssets
  /**
   * (optional) A unique id to be applied to the renderer element, used to scope styles.
   */
  id?: string
  /**
   * (optional) A ref for the renderer's container element, used for scoping event handlers.
   */
  containerRef?: React.RefObject<HTMLElement>
  /**
   * (optional) An object of custom options that should be passed to rendered shapes.
   */
  meta?: M
  /**
   * (optional) The current users to render.
   */
  users?: TLUsers<T>
  /**
   * (optional) The current snap lines to render.
   */
  snapLines?: TLSnapLine[]
  /**
   * (optional) The current erase line to render.
   */
  eraseLine?: number[][]
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
   * (optional) When true, the renderer will not show resize handles for selected objects.
   */
  hideResizeHandles?: boolean
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
   * (optional) When true, the renderer will not show the grid.
   */
  hideGrid?: boolean
  /**
   * (optional) When true, the renderer will show a dashed brush.
   */
  showDashedBrush?: boolean
  /**
   * (optional) The size of the grid step.
   */
  grid?: number
  /**
   * (optional) Use a performance mode.
   */
  performanceMode?: TLPerformanceMode
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
export const Renderer = observer(function _Renderer<
  T extends TLShape,
  M extends Record<string, unknown>
>({
  id = 'tl',
  shapeUtils,
  page,
  pageState,
  assets = EMPTY_OBJECT,
  users,
  userId,
  theme,
  meta,
  snapLines,
  eraseLine,
  grid,
  containerRef,
  performanceMode,
  hideHandles = false,
  hideIndicators = false,
  hideCloneHandles = false,
  hideBindingHandles = false,
  hideResizeHandles = false,
  hideRotateHandles = false,
  hideBounds = false,
  hideGrid = true,
  showDashedBrush = false,
  ...rest
}: RendererProps<T, M>) {
  useTLTheme(theme, '#' + id)

  const rSelectionBounds = React.useRef<TLBounds>(null)

  const rPageState = React.useRef<TLPageState>(pageState)

  React.useEffect(() => {
    rPageState.current = pageState
  }, [pageState])

  const [context, setContext] = React.useState<TLContextType<T>>(() => ({
    callbacks: rest,
    shapeUtils,
    rSelectionBounds,
    rPageState,
    bounds: {
      minX: 0,
      minY: 0,
      maxX: Infinity,
      maxY: Infinity,
      width: Infinity,
      height: Infinity,
    },
    inputs: new Inputs(),
  }))

  const onBoundsChange = React.useCallback((bounds: TLBounds) => {
    setContext((context) => ({
      ...context,
      bounds,
    }))
  }, [])

  return (
    <TLContext.Provider value={context as unknown as TLContextType<TLShape>}>
      <Canvas
        id={id}
        page={page}
        pageState={pageState}
        assets={assets}
        snapLines={snapLines}
        eraseLine={eraseLine}
        grid={grid}
        users={users}
        userId={userId}
        externalContainerRef={containerRef}
        hideBounds={hideBounds}
        hideIndicators={hideIndicators}
        hideHandles={hideHandles}
        hideCloneHandles={hideCloneHandles}
        hideBindingHandles={hideBindingHandles}
        hideRotateHandle={hideRotateHandles}
        hideResizeHandles={hideResizeHandles}
        hideGrid={hideGrid}
        showDashedBrush={showDashedBrush}
        onBoundsChange={onBoundsChange}
        performanceMode={performanceMode}
        meta={meta}
      />
    </TLContext.Provider>
  )
})

const EMPTY_OBJECT = {} as TLAssets
