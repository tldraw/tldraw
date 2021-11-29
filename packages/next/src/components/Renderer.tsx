/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { autorun } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useStylesheet } from '~hooks/useStylesheet'
import { nuContext, NuContext } from '~hooks/useContext'
import { Canvas } from './Canvas'
import type { TLNuBinding, TLNuCallbacks, TLNuTheme } from '~types'
import type { TLNuViewport } from '~lib'
import type { TLNuShape } from '~lib/TLNuShape'
import type { TLNuInputs } from '~lib/TLNuInputs'

export interface TLNuRendererProps<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> extends TLNuCallbacks {
  id?: string
  theme?: TLNuTheme
  shapes?: S[]
  bindings?: B[]
  selectedShapes?: S[]
  hoveredShape?: S
  viewport: TLNuViewport
  inputs: TLNuInputs
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
}: TLNuRendererProps<S, B>): JSX.Element {
  useStylesheet(theme, id)

  const [currentContext, setCurrentContext] = React.useState<NuContext>({
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
  })

  React.useEffect(() => {
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
        />
      </div>
    </nuContext.Provider>
  )
})
