/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Renderer } from './Renderer'
import type { TLNuApp, TLNuShape } from '~nu-lib'
import type { TLNuAppPropsWithApp } from '~types'

declare const window: Window & { tln: TLNuApp<any> }

export const LiftedAppProvider = observer(function App<S extends TLNuShape>(
  props: TLNuAppPropsWithApp<S>
): JSX.Element {
  const {
    onMount,
    onPersist,
    showBounds,
    showBoundsDetail,
    showBoundsRotation,
    showContextBar,
    showRotateHandle,
    showResizeHandles,
    app,
    ...rest
  } = props

  React.useLayoutEffect(() => {
    const unsubs: (() => void)[] = []
    app.history.reset()
    if (typeof window !== undefined) window['tln'] = app
    if (onMount) onMount(app, null)
    if (onPersist) unsubs.push(app.subscribe('persist', onPersist))
    return () => {
      unsubs.forEach((unsub) => unsub())
      app.dispose()
    }
  }, [app, onMount, onPersist])

  return (
    <Renderer
      inputs={app.inputs}
      viewport={app.viewport}
      shapes={app.shapesInViewport}
      selectedShapes={app.selectedShapes}
      hoveredShape={app.hoveredShape}
      selectedBounds={app.selectedBounds}
      brush={app.brush}
      {...app._events}
      showBounds={showBounds || app.showBounds}
      showBoundsDetail={showBoundsDetail || app.showBoundsDetail}
      showBoundsRotation={showBoundsRotation || app.showBoundsRotation}
      showContextBar={showContextBar || app.showContextBar}
      showRotateHandle={showRotateHandle || app.showRotateHandle}
      showResizeHandles={showResizeHandles || app.showResizeHandles}
      {...rest}
    />
  )
})
