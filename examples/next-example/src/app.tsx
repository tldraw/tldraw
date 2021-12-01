/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Renderer, TLNuBinding, TLNuSubscriptionCallback } from '@tldraw/next'
import { observer, Observer } from 'mobx-react-lite'
import { appContext, useAppContext, useCreateAppContext } from 'context'
import type { Shape } from 'stores'

interface AppProps {
  onMount?: TLNuSubscriptionCallback<'mount', Shape, TLNuBinding>
  onPersist?: TLNuSubscriptionCallback<'persist', Shape, TLNuBinding>
}

export default function AppProvider({ onMount, onPersist }: AppProps) {
  const app = useCreateAppContext()

  React.useLayoutEffect(() => {
    if (app) {
      if (onMount) app.subscribe('mount', onMount)
      if (onPersist) app.subscribe('persist', onPersist)
    }
  }, [])

  return (
    <appContext.Provider value={app}>
      <App />
    </appContext.Provider>
  )
}

const App = observer(function App(): JSX.Element {
  const app = useAppContext()

  const {
    currentPage: { shapes, bindings },
    shapesInViewport,
    viewport,
    inputs,
    hoveredShape,
    selectedShapes,
    selectedBounds,
    brush,
    onPan,
    onPointerDown,
    onPointerUp,
    onPointerMove,
    onPointerEnter,
    onPointerLeave,
    onKeyDown,
    onKeyUp,
  } = app

  const handleToolClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const tool = e.currentTarget.dataset.tool
      if (tool) app.selectTool(tool)
    },
    [app]
  )

  const handleToolDoubleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const tool = e.currentTarget.dataset.tool
      if (tool) app.selectTool(tool)
      app.setToolLock(true)
    },
    [app]
  )

  const handleToolLockClick = React.useCallback(() => {
    app.setToolLock(!app.isToolLocked)
  }, [])

  return (
    <div className="tlnu-app">
      <Renderer
        shapes={shapes.length > 150 ? shapesInViewport : shapes}
        bindings={bindings}
        viewport={viewport}
        inputs={inputs}
        hoveredShape={hoveredShape}
        selectedShapes={selectedShapes}
        selectedBounds={selectedBounds}
        brush={brush}
        onPan={onPan}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />
      <Observer>
        {() => (
          <div className="tlnu-toolbar">
            <label>
              Tool Lock
              <input type="checkbox" checked={app.isToolLocked} onChange={handleToolLockClick} />
            </label>
            {app.tools.map((tool) => {
              if (!tool.Component) {
                return null
              }

              return (
                <button
                  key={tool.id}
                  data-tool={tool.id}
                  onClick={handleToolClick}
                  onDoubleClick={handleToolDoubleClick}
                >
                  <tool.Component isActive={app.selectedTool === tool} />
                </button>
              )
            })}
          </div>
        )}
      </Observer>
      <Observer>
        {() => {
          return (
            <div className="tlnu-debug">
              {app.selectedTool.id} | {app.selectedTool.currentState.id}
            </div>
          )
        }}
      </Observer>
    </div>
  )
})
