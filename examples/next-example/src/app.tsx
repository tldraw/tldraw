/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  App as TLNuAppComponent,
  TLNuApp,
  TLNuContextBarComponent,
  TLNuSerializedApp,
  TLNuSubscriptionCallbacks,
} from '@tldraw/next'
import { NuBoxShape, NuEllipseShape, Shape, NuBoxTool, NuEllipseTool } from 'stores'
import { AppUI } from 'components/AppUI'

const ContextBar: TLNuContextBarComponent = ({ bounds }) => {
  return (
    <>
      <div
        style={{
          border: '1px solid black',
          padding: '4px 12px',
          borderRadius: '4px',
          width: 'fit-content',
          transform: `translateY(-${bounds.height / 2 + 40}px)`,
        }}
      >
        hello
      </div>
      <div
        style={{
          border: '1px solid black',
          padding: '4px 12px',
          borderRadius: '4px',
          transform: `translateY(${bounds.height / 2 + 24}px)`,
        }}
      >
        {bounds.width.toFixed()} x {bounds.height.toFixed()}
      </div>
    </>
  )
}

const components = {
  ContextBar,
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
            point: [400, 600],
            size: [100, 100],
          },
        ],
        bindings: [],
      },
    ],
  })

  const onMount = React.useCallback<TLNuSubscriptionCallbacks<Shape>['onMount']>((app) => {
    setApp(app)
    app.setCamera(undefined, 0.5)
  }, [])

  const onPersist = React.useCallback<TLNuSubscriptionCallbacks<Shape>['onPersist']>((app) => {
    // todo
  }, [])

  return (
    <div className="tlnu-app">
      <TLNuAppComponent
        onMount={onMount}
        onPersist={onPersist}
        serializedApp={serializedApp}
        shapeClasses={shapeClasses}
        toolClasses={toolClasses}
        components={components}
      />
      {app && <AppUI app={app} />}
    </div>
  )
}

export default App
