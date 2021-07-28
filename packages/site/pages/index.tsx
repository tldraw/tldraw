import * as React from 'react'
import {
  ColorStyle,
  DashStyle,
  SizeStyle,
  TLDraw,
  TLDrawDocument,
  TLDrawShape,
  TLDrawShapeUtils,
  TLDrawShapeType,
} from '@tldraw/tldraw'

export function Index() {
  const [document, setDocument] = React.useState<TLDrawDocument>({
    id: 'doc',
    pages: {
      page1: {
        id: 'page1',
        shapes: {
          rect1: {
            id: 'rect1',
            parentId: 'page1',
            name: 'Rectangle',
            childIndex: 0,
            type: TLDrawShapeType.Rectangle,
            point: [32, 32],
            size: [100, 100],
            style: {
              dash: DashStyle.Draw,
              size: SizeStyle.Medium,
              color: ColorStyle.Blue,
            },
          },
          ellipse1: {
            id: 'ellipse1',
            parentId: 'page1',
            name: 'Ellipse',
            childIndex: 1,
            type: TLDrawShapeType.Ellipse,
            point: [132, 132],
            radius: [50, 50],
            style: {
              dash: DashStyle.Draw,
              size: SizeStyle.Medium,
              color: ColorStyle.Blue,
            },
          },
        },
        bindings: {},
      },
    },
    pageStates: {
      page1: {
        id: 'page1',
        selectedIds: [],
        currentParentId: 'page1',
        camera: {
          point: [0, 0],
          zoom: 1,
        },
      },
    },
  })

  return <TLDraw document={document} />
}

export default Index
