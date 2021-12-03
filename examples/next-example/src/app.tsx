/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  App as TLNuAppComponent,
  TLNuApp,
  TLNuComponents,
  TLNuSerializedApp,
  TLNuSubscriptionCallbacks,
} from '@tldraw/next'
import { NuBoxShape, NuEllipseShape, Shape, NuBoxTool, NuEllipseTool } from 'stores'
import { AppUI } from 'components/AppUI'
import { NuContextBar } from 'components/NuContextBar'
import { appContext } from 'context'

const components: TLNuComponents<Shape> = {
  ContextBar: NuContextBar,
}

function App(): JSX.Element {
  const [app, setApp] = React.useState<TLNuApp<Shape>>()

  const [shapeClasses] = React.useState(() => [NuBoxShape, NuEllipseShape])

  const [toolClasses] = React.useState(() => [NuBoxTool, NuEllipseTool])

  const [serializedApp, setSerializedApp] = React.useState<TLNuSerializedApp>({
    currentPageId: 'page1',
    selectedIds: ['box2'],
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
          {
            id: 'box2',
            type: 'box',
            parentId: 'page1',
            point: [400, 300],
            size: [100, 100],
          },
        ],
        bindings: [],
      },
    ],
  })

  const onMount = React.useCallback<TLNuSubscriptionCallbacks<Shape>['onMount']>((app) => {
    setApp(app)
  }, [])

  const onPersist = React.useCallback<TLNuSubscriptionCallbacks<Shape>['onPersist']>((app) => {
    // todo
  }, [])

  return (
    <div className="tlnu-app">
      <appContext.Provider value={app}>
        <TLNuAppComponent
          onMount={onMount}
          onPersist={onPersist}
          serializedApp={serializedApp}
          shapeClasses={shapeClasses}
          toolClasses={toolClasses}
          components={components}
        />
        <AppUI />
      </appContext.Provider>
    </div>
  )
}

export default App
