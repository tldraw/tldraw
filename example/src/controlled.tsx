import * as React from 'react'
import {
  TLDraw,
  ColorStyle,
  DashStyle,
  SizeStyle,
  TLDrawDocument,
  TLDrawShapeType,
  TLDrawState,
} from '@tldraw/tldraw'

export default function Controlled() {
  const rDocument = React.useRef<TLDrawDocument>({
    name: 'New Document',
    version: TLDrawState.version,
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
            type: TLDrawShapeType.Rectangle,
            parentId: 'page1',
            name: 'Rectangle',
            childIndex: 1,
            point: [200, 200],
            size: [100, 100],
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

  const [doc, setDoc] = React.useState<TLDrawDocument>(rDocument.current)

  React.useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      const currentDoc = rDocument.current
      const rect1 = currentDoc.pages.page1.shapes.rect1
      if (rect1) {
        i++
        const next = {
          ...currentDoc,
          pages: {
            ...currentDoc.pages,
            page1: {
              ...currentDoc.pages.page1,
              shapes: {
                ...currentDoc.pages.page1.shapes,
                rect1: {
                  ...rect1,
                  style: {
                    ...rect1.style,
                    color: i % 2 ? ColorStyle.Red : ColorStyle.Blue,
                  },
                },
              },
            },
          },
        }

        rDocument.current = next
        setDoc(next)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const handleChange = React.useCallback((tlstate) => {
    rDocument.current = tlstate.document
  }, [])

  return <TLDraw document={doc} onChange={handleChange} />
}
