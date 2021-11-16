/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { ColorStyle, Tldraw, TDShapeType, TldrawApp } from '@tldraw/Tldraw'

export default function Imperative(): JSX.Element {
  const rTldrawApp = React.useRef<TldrawApp>()

  const handleMount = React.useCallback((app: TldrawApp) => {
    rTldrawApp.current = app

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

      app.patchShapes({
        id: 'rect1',
        style: {
          ...rect1.style,
          color,
        },
      })

      i++
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return <Tldraw onMount={handleMount} />
}
