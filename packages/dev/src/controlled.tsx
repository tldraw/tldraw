import * as React from 'react'
import {
  TLDraw,
  ColorStyle,
  DashStyle,
  SizeStyle,
  TLDrawDocument,
  TLDrawShapeType,
} from '@tldraw/tldraw'

export default function Controlled() {
  const [doc, setDoc] = React.useState<TLDrawDocument>({
    id: 'doc',
    pages: {
      page1: {
        id: 'page1',
        shapes: {
          rect1: {
            id: 'rect1',
            type: TLDrawShapeType.Rectangle,
            parentId: 'page1',
            name: 'Rectangle',
            childIndex: 1,
            point: [100, 100],
            size: [100, 100],
            style: {
              dash: DashStyle.Draw,
              size: SizeStyle.Medium,
              color: ColorStyle.Blue,
            },
          },
          rect2: {
            id: 'rect2',
            parentId: 'page1',
            name: 'Rectangle',
            childIndex: 2,
            type: TLDrawShapeType.Rectangle,
            point: [150, 250],
            size: [150, 150],
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
        selectedIds: ['rect1'],
        camera: {
          point: [0, 0],
          zoom: 1,
        },
      },
    },
  })

  React.useEffect(() => {
    const timeout = setTimeout(
      () =>
        setDoc({
          ...doc,
          pages: {
            ...doc.pages,
            page1: {
              ...doc.pages.page1,
              shapes: {
                ...doc.pages.page1.shapes,
                rect2: {
                  ...doc.pages.page1.shapes.rect2,
                  style: {
                    ...doc.pages.page1.shapes.rect2.style,
                    color: ColorStyle.Orange,
                  },
                },
              },
            },
          },
        }),
      1000
    )

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return <TLDraw document={doc} />
}
