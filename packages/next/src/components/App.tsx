/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuAppPropsWithoutApp, TLNuAppPropsWithApp } from '~types'
import type { TLNuShape } from '~nu-lib'
import { useSetup, nuContext, useApp, usePropControl, useStylesheet, useContextState } from '~hooks'
import { EMPTY_OBJECT } from '~constants'
import { Canvas } from './Canvas'

export const App = observer(function App<S extends TLNuShape>(
  props: TLNuAppPropsWithoutApp<S> | TLNuAppPropsWithApp<S>
): JSX.Element {
  const { id, theme = EMPTY_OBJECT } = props
  useStylesheet(theme, id)

  const app = useApp(props)

  usePropControl(app, props)

  const currentContext = useContextState(
    app.viewport,
    app.inputs,
    app._events,
    props.components,
    props.meta
  )

  useSetup(app, props.onMount, props.onPersist)

  return (
    <nuContext.Provider value={currentContext}>
      <Canvas
        {...props}
        brush={app.brush}
        hoveredShape={app.hoveredShape}
        selectedBounds={app.selectedBounds}
        selectedShapes={app.selectedShapes}
        shapes={app.shapesInViewport}
        showBounds={app.showBounds}
        showBoundsRotation={app.showBoundsRotation}
        showResizeHandles={app.showResizeHandles}
        showRotateHandle={app.showRotateHandle}
        showBoundsDetail={app.showBoundsDetail}
        showContextBar={app.showContextBar}
      />
    </nuContext.Provider>
  )
})
