/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'

/* eslint-disable @typescript-eslint/no-unused-vars */
import type { TLShape, TLBounds } from '+types'
import { TLShapeUtil } from './TLShapeUtil'
import { render } from '@testing-library/react'
import { SVGContainer } from '+components'
import Utils from '+utils'
import type { TLComponent, TLIndicator } from '+shape-utils'

export interface BoxShape extends TLShape {
  type: 'box'
  size: number[]
}

const meta = { legs: 93 }

type Meta = typeof meta

export const boxShape: BoxShape = {
  id: 'example1',
  type: 'box',
  parentId: 'page',
  childIndex: 0,
  name: 'Example Shape',
  point: [0, 0],
  size: [100, 100],
  rotation: 0,
}

export class BoxUtil extends TLShapeUtil<BoxShape, SVGSVGElement, Meta> {
  age = 100

  Component: TLComponent<BoxShape, SVGSVGElement, Meta> = ({ shape, events, meta }, ref) => {
    type T = typeof meta.legs
    type C = T['toFixed']

    return (
      <SVGContainer ref={ref}>
        <g {...events}>
          <rect width={shape.size[0]} height={shape.size[1]} fill="none" stroke="black" />
        </g>
      </SVGContainer>
    )
  }

  Indicator: TLIndicator<BoxShape, SVGSVGElement, Meta> = ({ shape }) => {
    return (
      <SVGContainer>
        <rect width={shape.size[0]} height={shape.size[1]} fill="none" stroke="black" />
      </SVGContainer>
    )
  }

  getBounds = (shape: BoxShape) => {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      const [width, height] = shape.size
      return {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      } as TLBounds
    })

    return Utils.translateBounds(bounds, shape.point)
  }
}

describe('When creating a minimal ShapeUtil', () => {
  const Box = new BoxUtil()

  it('creates a shape utils', () => {
    expect(Box).toBeTruthy()
  })

  test('accesses this in an override method', () => {
    expect(Box.shouldRender(boxShape, { ...boxShape, point: [1, 1] })).toBe(true)
  })

  test('mounts component without crashing', () => {
    const ref = React.createRef<SVGSVGElement>()

    const ref2 = React.createRef<HTMLDivElement>()

    const H = React.forwardRef<HTMLDivElement, { message: string }>((props, ref) => {
      return <div ref={ref2}>{props.message}</div>
    })

    render(<H message="Hello" />)

    render(
      <Box._Component
        ref={ref}
        shape={boxShape}
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        isCurrentParent={false}
        meta={{} as any}
        events={{} as any}
      />
    )
  })
})

abstract class TLRealisticShapeUtil<
  T extends TLShape,
  E extends Element = any,
  M = any
> extends TLShapeUtil<T, E, M> {
  abstract type: T['type']

  abstract getShape: (props: Partial<T>) => T

  create = (props: { id: string } & Partial<T>) => {
    this.refMap.set(props.id, React.createRef())
    return this.getShape(props)
  }
}

describe('When creating a realistic API around TLShapeUtil', () => {
  class ExtendedBoxUtil extends TLRealisticShapeUtil<BoxShape, SVGSVGElement, Meta> {
    type = 'box' as const

    age = 100

    Component: TLComponent<BoxShape, SVGSVGElement, Meta> = ({ shape, events, meta }, ref) => {
      type T = typeof meta.legs
      type C = T['toFixed']

      return (
        <SVGContainer ref={ref}>
          <g {...events}>
            <rect width={shape.size[0]} height={shape.size[1]} fill="none" stroke="black" />
          </g>
        </SVGContainer>
      )
    }

    Indicator: TLIndicator<BoxShape, SVGSVGElement, Meta> = ({ shape }) => {
      return (
        <SVGContainer>
          <rect width={shape.size[0]} height={shape.size[1]} fill="none" stroke="black" />
        </SVGContainer>
      )
    }

    getShape = (props: Partial<BoxShape>): BoxShape => ({
      id: 'example1',
      type: 'box',
      parentId: 'page',
      childIndex: 0,
      name: 'Example Shape',
      point: [0, 0],
      size: [100, 100],
      rotation: 0,
      ...props,
    })

    getBounds = (shape: BoxShape) => {
      const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
        const [width, height] = shape.size
        return {
          minX: 0,
          maxX: width,
          minY: 0,
          maxY: height,
          width,
          height,
        } as TLBounds
      })

      return Utils.translateBounds(bounds, shape.point)
    }
  }

  const Box = new ExtendedBoxUtil()

  it('creates a shape utils', () => {
    expect(Box).toBeTruthy()
  })

  it('creates a shape utils with extended properties', () => {
    expect(Box.age).toBe(100)
  })

  it('creates a shape', () => {
    expect(Box.create({ id: 'box1' })).toStrictEqual({
      ...boxShape,
      id: 'box1',
    })
  })

  test('accesses this in an override method', () => {
    expect(Box.shouldRender(boxShape, { ...boxShape, point: [1, 1] })).toBe(true)
  })

  test('mounts component without crashing', () => {
    const box = Box.create({ id: 'box1' })

    const ref = React.createRef<SVGSVGElement>()

    const ref2 = React.createRef<HTMLDivElement>()

    const H = React.forwardRef<HTMLDivElement, { message: string }>((props, ref) => {
      return <div ref={ref2}>{props.message}</div>
    })

    render(<H message="Hello" />)

    render(
      <Box._Component
        ref={ref}
        shape={box}
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        isCurrentParent={false}
        meta={meta}
        events={{} as any}
      />
    )
  })
})
