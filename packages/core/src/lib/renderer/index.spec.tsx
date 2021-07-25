import * as React from 'react'
import { render } from '@testing-library/react'
import { Renderer } from './renderer'
import { Utils, Vec } from '@tldraw/core'
import {
  TLTransformInfo,
  TLPointerInfo,
  TLShapeUtils,
  TLShape,
  TLShapeUtil,
  TLBounds,
} from '../types'

// Define a custom shape
export interface RectangleShape extends TLShape {
  type: 'rectangle'
  size: number[]
}

// Create a "shape utility" class that interprets that shape
class Rectangle extends TLShapeUtil<RectangleShape> {
  type = 'rectangle' as const

  defaultProps = {
    id: 'id',
    type: 'rectangle' as const,
    name: 'Rectangle',
    parentId: 'page',
    childIndex: 0,
    point: [0, 0],
    size: [100, 100],
    rotation: 0,
  }

  render(shape: RectangleShape) {
    const { size } = shape
    return (
      <rect
        width={size[0]}
        height={size[1]}
        fill="none"
        stroke="black"
        strokeWidth={2}
      />
    )
  }

  getBounds(shape: RectangleShape) {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      const [width, height] = shape.size
      return {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      }
    })

    return Utils.translateBounds(bounds, shape.point)
  }

  getRotatedBounds(shape: RectangleShape) {
    return Utils.getBoundsFromPoints(
      Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)
    )
  }

  getCenter(shape: RectangleShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTest(shape: RectangleShape, point: number[]) {
    return Utils.pointInBounds(point, this.getBounds(shape))
  }

  hitTestBounds(shape: RectangleShape, bounds: TLBounds) {
    const rotatedCorners = Utils.getRotatedCorners(
      this.getBounds(shape),
      shape.rotation
    )

    return (
      Utils.boundsContainPolygon(bounds, rotatedCorners) ||
      Utils.boundsCollidePolygon(bounds, rotatedCorners)
    )
  }

  transform(
    shape: TLShape,
    bounds: TLBounds,
    info: TLTransformInfo<RectangleShape>
  ) {
    shape.point = [bounds.minX, bounds.minY]
    return this
  }

  transformSingle(
    shape: TLShape,
    bounds: TLBounds,
    info: TLTransformInfo<RectangleShape>
  ) {
    return this.transform(shape, bounds, info)
  }
}

const rectangle = new Rectangle()

function useAppState() {
  // Define the initial state (page + pageState)
  const [state, setState] = React.useState({
    page: {
      id: 'page1',
      shapes: {
        rect1: {
          id: 'rect1',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 0,
          type: 'rectangle',
          point: [0, 0],
          rotation: 0,
          size: [100, 100],
        },
      },
      bindings: {},
    },
    pageState: {
      id: 'page1',
      selectedIds: [],
      currentParentId: 'page1',
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  })

  // Handle events
  const createRectAtPoint = React.useCallback((info: TLPointerInfo) => {
    setState((state) => {
      const { camera } = state.pageState

      // Screen to document
      const point = Vec.sub(Vec.div(info.point, camera.zoom), camera.point)

      // Create a new shape via the rectangle shape util
      const newShape = rectangle.create({
        id: Date.now() + '',
        parentId: 'page1',
        point: Vec.sub(point, [50, 50]),
        childIndex: Object.keys(state.page.shapes).length,
      })

      return {
        ...state,
        page: {
          ...state.page,
          shapes: {
            ...state.page.shapes,
            [newShape.id]: newShape,
          },
        },
      }
    })
  }, [])

  // Handle camera pan
  const handlePan = React.useCallback((delta: number[]) => {
    setState((state) => {
      const { point, zoom } = state.pageState.camera
      return {
        ...state,
        pageState: {
          ...state.pageState,
          camera: {
            zoom,
            point: Vec.sub(point, Vec.div(delta, zoom)),
          },
        },
      }
    })
  }, [])

  // Handle camera pinch
  const handlePinch = React.useCallback(
    (origin: number[], delta: number[], distanceDelta: number) => {
      setState((state) => {
        const {
          camera: { point, zoom },
        } = state.pageState

        let nextPoint = Vec.sub(point, Vec.div(delta, zoom))

        const nextZoom = Math.max(
          0.15,
          Math.min(5, zoom - (distanceDelta / 300) * zoom)
        )

        const p0 = Vec.sub(Vec.div(origin, zoom), point)
        const p1 = Vec.sub(Vec.div(origin, nextZoom), point)

        nextPoint = Vec.add(point, Vec.sub(p1, p0))
        return {
          ...state,
          pageState: {
            ...state.pageState,
            camera: {
              point: nextPoint,
              zoom: nextZoom,
            },
          },
        }
      })
    },
    []
  )

  return {
    state,
    handlePan,
    handlePinch,
    createRectAtPoint,
  }
}

// Create a union of all custom shape types
type MyShapes = RectangleShape

// Create a table of shape type -> shape utility singleton
const shapeUtils: TLShapeUtils<MyShapes> = { rectangle }

describe('Index', () => {
  it('should render successfully', () => {
    const { state, createRectAtPoint, handlePan, handlePinch } = useAppState()

    const { baseElement } = render(
      <Renderer
        page={state.page}
        pageState={state.pageState}
        shapeUtils={shapeUtils}
        onPointCanvas={createRectAtPoint}
        onPointShape={createRectAtPoint}
        onPan={handlePan}
        onPinch={handlePinch}
      />
    )

    expect(baseElement).toBeTruthy()
  })
})
