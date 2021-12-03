import * as React from 'react'
import { TLNuApp } from '@tldraw/next'
import { NuBoxShape, NuEllipseShape, Shape } from 'stores'
import { NuBoxTool, NuEllipseTool } from 'stores/tools'

type NuAppContext = TLNuApp<Shape>

export const appContext = React.createContext({} as NuAppContext)

export function useCreateAppContext() {
  const [app] = React.useState<NuAppContext>(
    new TLNuApp<Shape>(
      {
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
      },
      [NuBoxShape, NuEllipseShape],
      [NuBoxTool, NuEllipseTool]
    )
  )

  return app
}

export function useAppContext() {
  return React.useContext(appContext)
}
