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
import {
  NuBoxShape,
  NuEllipseShape,
  Shape,
  NuBoxTool,
  NuEllipseTool,
  NuPolygonTool,
  NuPolygonShape,
  NuPenShape,
  NuPenTool,
  NuHighlighterShape,
  NuHighlighterTool,
  NuDotShape,
  NuDotTool,
} from 'stores'
import { AppUI } from 'components/AppUI'
import { NuContextBar } from 'components/NuContextBar'
import { appContext } from 'context'

const components: TLNuComponents<Shape> = {
  ContextBar: NuContextBar,
}

function App(): JSX.Element {
  const [app, setApp] = React.useState<TLNuApp<Shape>>()

  const [shapeClasses] = React.useState(() => [
    NuBoxShape,
    NuEllipseShape,
    NuPolygonShape,
    NuPenShape,
    NuHighlighterShape,
    NuDotShape,
  ])

  const [toolClasses] = React.useState(() => [
    NuBoxTool,
    NuEllipseTool,
    NuPolygonTool,
    NuPenTool,
    NuHighlighterTool,
    NuDotTool,
  ])

  const [model, setModel] = React.useState<TLNuSerializedApp>({
    currentPageId: 'page1',
    selectedIds: ['dot1'],
    pages: [
      {
        name: 'Page',
        id: 'page1',
        shapes: [
          {
            id: 'box1',
            type: 'box',
            parentId: 'page1',
            point: [100, 400],
            size: [100, 100],
          },
          {
            id: 'ellipse1',
            type: 'ellipse',
            parentId: 'page1',
            point: [100, 100],
            size: [100, 200],
            rotation: Math.PI / 6,
          },
          {
            id: 'polygon1',
            type: 'polygon',
            parentId: 'page1',
            point: [300, 100],
            size: [150, 150],
          },
          {
            id: 'polygon2',
            type: 'polygon',
            parentId: 'page1',
            point: [100, 300],
            size: [150, 150],
            sides: 5,
            ratio: 0.5,
          },
          {
            id: 'polygon3',
            type: 'polygon',
            parentId: 'page1',
            point: [300, 300],
            size: [150, 150],
            sides: 5,
            ratio: 1,
          },
          {
            id: 'polygon4',
            type: 'polygon',
            parentId: 'page1',
            point: [500, 300],
            size: [150, 150],
            sides: 5,
            ratio: 0,
          },
          {
            id: 'dot1',
            type: 'dot',
            parentId: 'page1',
            point: [500, 300],
            radius: 3,
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
          model={model}
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
