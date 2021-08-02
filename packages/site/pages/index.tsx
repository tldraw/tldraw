import * as React from 'react'
import dynamic from 'next/dynamic'
import { ColorStyle, DashStyle, SizeStyle, TLDrawShapeType } from '@tldraw/tldraw'
import type { TLDrawDocument } from '@tldraw/tldraw'
const TLDraw = dynamic(() => import('@tldraw/tldraw'), { ssr: false })

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
              color: ColorStyle.Cyan,
            },
          },
          draw1: {
            id: 'draw1',
            parentId: 'page1',
            name: 'Draw',
            childIndex: 1,
            type: TLDrawShapeType.Draw,
            point: [232, 232],
            points: [
              [50, 0],
              [100, 100],
              [0, 100],
              [50, 0],
              [100, 100],
              [0, 100],
              [50, 0],
              [56, 5],
            ],
            style: {
              dash: DashStyle.Draw,
              size: SizeStyle.Medium,
              color: ColorStyle.Green,
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
