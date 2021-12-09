/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Renderer } from './Renderer'
import { TLNuApp, TLNuSerializedApp, TLNuShape } from '~nu-lib'
import type { TLNuAppPropsWithoutApp } from '~types'

declare const window: Window & { tln: TLNuApp<any> }

export const ControlledAppProvider = observer(function App<S extends TLNuShape>(
  props: TLNuAppPropsWithoutApp<S>
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
    ...rest
  } = props

  const [app] = React.useState(
    () => new TLNuApp(props.model, props.shapeClasses, props.toolClasses)
  )

  React.useLayoutEffect(() => {
    const unsubs: (() => void)[] = []
    if (!app) return
    if (typeof window !== undefined) window['tln'] = app
    app.history.reset()
    if (onMount) onMount(app, null)
    if (onPersist) unsubs.push(app.subscribe('persist', onPersist))
    return () => {
      unsubs.forEach((unsub) => unsub())
      app.dispose()
    }
  }, [app, onMount, onPersist])

  React.useEffect(() => {
    if (props.model) app.history.deserialize(props.model as unknown as TLNuSerializedApp)
  }, [props.model])

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
