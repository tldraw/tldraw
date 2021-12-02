/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Renderer } from './Renderer'
import { TLNuApp, TLNuShape } from '~nu-lib'
import { RendererContextProvider } from './RendererContextProvider'
import type { TLNuAppProps, TLNuBinding } from '~types'
import { observer } from 'mobx-react-lite'

type TLNuAppContext<S extends TLNuShape, B extends TLNuBinding> = TLNuApp<S, B>

export const appContext = React.createContext({} as TLNuAppContext<any, any>)

export const App = observer(function App<S extends TLNuShape, B extends TLNuBinding>({
  id,
  meta,
  components,
  theme,
  showBounds,
  showRotateHandle,
  showResizeHandles,
  onMount,
  onPersist,
  children,
  ...rest
}: TLNuAppProps<S, B>): JSX.Element {
  const [app] = React.useState(() =>
    'app' in rest
      ? rest.app
      : new TLNuApp<S, B>(rest.serializedApp, rest.shapeClasses, rest.toolClasses)
  )

  React.useLayoutEffect(() => {
    const unsubs: (() => void)[] = []
    if (!app) return
    app.history.reset()
    if (onMount) onMount(app, null)
    if (onPersist) unsubs.push(app.subscribe('persist', onPersist))
    return () => unsubs.forEach((unsub) => unsub())
  }, [app, onMount, onPersist])

  return (
    <RendererContextProvider
      id={id}
      meta={meta}
      theme={theme}
      components={components}
      inputs={app.inputs}
      onKeyDown={app.onKeyDown}
      onKeyUp={app.onKeyUp}
      onPan={app.onPan}
      onPointerDown={app.onPointerDown}
      onPointerEnter={app.onPointerEnter}
      onPointerLeave={app.onPointerLeave}
      onPointerMove={app.onPointerMove}
      onPointerUp={app.onPointerUp}
      viewport={app.viewport}
    >
      <Renderer
        id={id}
        showBounds={showBounds}
        showRotateHandle={showRotateHandle}
        showResizeHandles={showResizeHandles}
        shapes={app.shapesInViewport}
        selectedShapes={app.selectedShapes}
        hoveredShape={app.hoveredShape}
        selectedBounds={app.selectedBounds}
        brush={app.brush}
      >
        {children}
      </Renderer>
    </RendererContextProvider>
  )
})
