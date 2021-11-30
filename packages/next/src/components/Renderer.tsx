/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { autorun } from 'mobx'
import { observer } from 'mobx-react-lite'
import { Canvas, BoundsForeground, BoundsBackground } from '~components'
import { useStylesheet, nuContext, NuContext } from '~hooks'
import type { TLNuViewport, TLNuShape, TLNuInputs } from '~nu-lib'
import type {
  TLNuBinding,
  TLNuCallbacks,
  TLNuTheme,
  TLNuBounds,
  TLNuBoundsComponent,
  TLNuComponents,
} from '~types'

export interface TLNuRendererProps<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> extends TLNuCallbacks<S> {
  id?: string
  theme?: TLNuTheme
  shapes?: S[]
  bindings?: B[]
  selectedShapes?: S[]
  hoveredShape?: S
  brush?: TLNuBounds
  selectedBounds?: TLNuBounds
  viewport: TLNuViewport
  inputs: TLNuInputs
  BoundsComponent?: TLNuBoundsComponent<S>
  components?: Partial<TLNuComponents<S>>
  meta?: any
}

export const Renderer = observer(function Renderer<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
>({
  id,
  theme = {},
  shapes = [],
  bindings = [],
  selectedShapes = [],
  hoveredShape,
  selectedBounds,
  brush,
  viewport,
  inputs,
  onPan,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onPointerEnter,
  onPointerLeave,
  onKeyDown,
  onKeyUp,
  meta,
  components = {} as Partial<TLNuComponents<S>>,
}: TLNuRendererProps<S, B>): JSX.Element {
  useStylesheet(theme, id)

  const [currentContext, setCurrentContext] = React.useState<NuContext<S>>(() => {
    const { boundsBackground = BoundsBackground, boundsForeground = BoundsForeground } = components

    return {
      viewport,
      inputs,
      callbacks: {
        onPan,
        onPointerDown,
        onPointerUp,
        onPointerMove,
        onPointerEnter,
        onPointerLeave,
        onKeyDown,
        onKeyUp,
      },
      components: {
        boundsBackground,
        boundsForeground,
      },
      meta,
    }
  })

  React.useEffect(() => {
    const { boundsBackground = BoundsBackground, boundsForeground = BoundsForeground } = components

    autorun(() => {
      setCurrentContext({
        viewport,
        inputs,
        callbacks: {
          onPan,
          onPointerDown,
          onPointerUp,
          onPointerMove,
          onPointerEnter,
          onPointerLeave,
          onKeyDown,
          onKeyUp,
        },
        components: {
          boundsBackground,
          boundsForeground,
        },
        meta,
      })
    })
  }, [])

  return (
    <nuContext.Provider value={currentContext}>
      <div className="nu-container">
        <Canvas
          shapes={shapes}
          bindings={bindings}
          selectedShapes={selectedShapes}
          hoveredShape={hoveredShape}
          brush={brush}
          selectedBounds={selectedBounds}
        />
      </div>
    </nuContext.Provider>
  )
})
