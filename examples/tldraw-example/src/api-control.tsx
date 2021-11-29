/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { ColorStyle, Tldraw, TDShapeType, TldrawApp } from '@tldraw/tldraw'

export default function Imperative(): JSX.Element {
  const rTldrawApp = React.useRef<TldrawApp>()

  const handleMount = React.useCallback((app: TldrawApp) => {
    rTldrawApp.current = app

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    window.app = app

    app.createShapes(
      {
        id: 'rect1',
        type: TDShapeType.Rectangle,
        name: 'Rectangle',
        childIndex: 1,
        point: [0, 0],
        size: [100, 100],
      },
      {
        id: 'rect2',
        name: 'Rectangle',
        type: TDShapeType.Rectangle,
        point: [200, 200],
        size: [100, 100],
      },
      {
        id: 'image3',
        name: 'Image',
        type: TDShapeType.Image,
        point: [230, 300],
        size: [160, 180],
      }
    )
  }, [])

  React.useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      const app = rTldrawApp.current!
      const rect1 = app.getShape('rect1')

      if (!rect1) {
        app.createShapes({
          id: 'rect1',
          type: TDShapeType.Rectangle,
          name: 'Rectangle',
          childIndex: 1,
          point: [0, 0],
          size: [100, 100],
        })
        return
      }

      const color = i % 2 ? ColorStyle.Red : ColorStyle.Blue

      //   app.patchShapes({
      //     id: 'rect1',
      //     style: {
      //       ...rect1.style,
      //       color,
      //     },
      //   })

      i++
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return <Tldraw onMount={handleMount} />
}
