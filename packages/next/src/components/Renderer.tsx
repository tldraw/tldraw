/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Canvas } from '~components'
import { useStylesheet } from '~hooks'
import type { TLNuShape } from '~nu-lib'
import type { TLNuBinding, TLNuRendererProps } from '~types'
import { EMPTY_ARRAY, EMPTY_OBJECT } from '~constants'

export const Renderer = observer(function Renderer<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
>({
  bindings = EMPTY_ARRAY,
  brush,
  children,
  hoveredShape,
  id,
  selectedBounds,
  selectedShapes = EMPTY_ARRAY,
  shapes = EMPTY_ARRAY,
  showBounds,
  showResizeHandles,
  showRotateHandle,
  theme = EMPTY_OBJECT,
}: TLNuRendererProps<S, B>): JSX.Element {
  useStylesheet(theme, id)

  return (
    <div className="nu-container">
      <Canvas
        shapes={shapes}
        bindings={bindings}
        selectedShapes={selectedShapes}
        hoveredShape={hoveredShape}
        brush={brush}
        selectedBounds={selectedBounds}
        showBounds={showBounds}
        showRotateHandle={showRotateHandle}
        showResizeHandles={showResizeHandles}
      >
        {children}
      </Canvas>
    </div>
  )
})
