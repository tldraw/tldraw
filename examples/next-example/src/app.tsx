/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { App as TLNuAppComponent, TLNuApp, TLNuSubscriptionCallbacks } from '@tldraw/next'
import { NuBoxShape, NuEllipseShape, Shape, NuBoxTool, NuEllipseTool } from 'stores'
import { Observer } from 'mobx-react-lite'

function App(): JSX.Element {
  const [app, setApp] = React.useState<TLNuApp<Shape>>()

  const onMount = React.useCallback<TLNuSubscriptionCallbacks<Shape>['onMount']>((app) => {
    setApp(app)
  }, [])

  const onPersist = React.useCallback<TLNuSubscriptionCallbacks<Shape>['onPersist']>((app) => {
    console.log('persisting!')
  }, [])

  return (
    <div className="tlnu-app">
      <TLNuAppComponent
        onMount={onMount}
        onPersist={onPersist}
        serializedApp={{
          currentPageId: 'page1',
          selectedIds: [],
          pages: [
            {
              name: 'Page',
              id: 'page1',
              shapes: [
                {
                  id: 'box1',
                  type: 'box',
                  parentId: 'page1',
                  point: [100, 100],
                  size: [100, 100],
                },
              ],
              bindings: [],
            },
          ],
        }}
        shapeClasses={[NuBoxShape, NuEllipseShape]}
        toolClasses={[NuBoxTool, NuEllipseTool]}
      />
      {app && <AppUI app={app} />}
    </div>
  )
}

function AppUI({ app }: { app: TLNuApp<Shape> }) {
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
  }, [app])

  return (
    <>
      <Observer>
        {() => (
          <div className="tlnu-toolbar">
            <label>
              Tool Lock
              <input type="checkbox" checked={app.isToolLocked} onChange={handleToolLockClick} />
            </label>
            {Array.from(app.tools.values()).map((tool) => {
              if (!tool.Component) {
                return null
              }

              return (
                <button
                  key={tool.toolId}
                  data-tool={tool.toolId}
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
              {app.selectedTool.toolId} | {app.selectedTool.currentState.stateId}
            </div>
          )
        }}
      </Observer>
    </>
  )
}

export default App
