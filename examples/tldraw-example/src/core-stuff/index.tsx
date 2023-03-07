import {
  CursorComponent,
  HTMLContainer,
  Renderer,
  TLBounds,
  TLPage,
  TLShape,
  TLShapeUtil,
} from '@tldraw/core'
import * as React from 'react'

export interface BasicShape extends TLShape {
  type: 'basic'
  size: number[]
}

export class BasicUtil extends TLShapeUtil<BasicShape> {
  getBounds = (shape: BasicShape) => {
    const [width, height] = shape.size

    return {
      minX: shape.point[0],
      maxX: shape.point[0] + width,
      minY: shape.point[1],
      maxY: shape.point[1] + height,
      width,
      height,
    } as TLBounds
  }

  Component = TLShapeUtil.Component<BasicShape>(({ shape }, ref) => {
    return (
      <HTMLContainer ref={ref} style={{ width: '100%', height: '100%', border: '2px solid black' }}>
        {shape.id}
      </HTMLContainer>
    )
  })

  Indicator = TLShapeUtil.Indicator<BasicShape>(({ shape }) => {
    return <rect width={shape.size[0]} height={shape.size[1]} />
  })
}

export const shapeUtils = {
  basic: new BasicUtil(),
}
