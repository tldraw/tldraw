import * as React from 'react'
import {
  TLBounds,
  Utils,
  Vec,
  TLTransformInfo,
  Intersect,
  TLShapeProps,
  HTMLContainer,
} from '@tldraw/core'
import { defaultStyle, getShapeStyle } from '~shape/shape-styles'
import { PostItShape, TLDrawShapeUtil, TLDrawShapeType, TLDrawToolType, ArrowShape } from '~types'

// TODO
// [ ] - Make sure that fill does not extend drawn shape at corners

export class PostIt extends TLDrawShapeUtil<PostItShape, HTMLDivElement> {
  type = TLDrawShapeType.PostIt as const
  toolType = TLDrawToolType.Bounds
  canBind = true
  pathCache = new WeakMap<number[], string>([])

  defaultProps: PostItShape = {
    id: 'id',
    type: TLDrawShapeType.PostIt as const,
    name: 'PostIt',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    size: [1, 1],
    text: '',
    rotation: 0,
    style: defaultStyle,
  }

  shouldRender(prev: PostItShape, next: PostItShape) {
    return next.size !== prev.size || next.style !== prev.style
  }

  render = React.forwardRef<HTMLDivElement, TLShapeProps<PostItShape, HTMLDivElement>>(
    ({ shape, isBinding, meta, events }, ref) => {
      const [count, setCount] = React.useState(0)

      return (
        <HTMLContainer ref={ref} {...events}>
          <div
            style={{
              pointerEvents: 'all',
              backgroundColor: 'rgba(255, 220, 100)',
              border: '1px solid black',
              fontFamily: 'sans-serif',
              height: '100%',
              width: '100%',
            }}
          >
            <div onPointerDown={(e) => e.preventDefault()}>
              <input
                type="textarea"
                style={{ width: '100%', height: '50%', background: 'none' }}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <button onPointerDown={() => setCount((count) => count + 1)}>{count}</button>
            </div>
          </div>
        </HTMLContainer>
      )
    }
  )

  renderIndicator(shape: PostItShape) {
    const {
      style,
      size: [width, height],
    } = shape

    const styles = getShapeStyle(style, false)
    const strokeWidth = +styles.strokeWidth

    const sw = strokeWidth

    return (
      <rect
        x={sw / 2}
        y={sw / 2}
        rx={1}
        ry={1}
        width={Math.max(1, width - sw)}
        height={Math.max(1, height - sw)}
      />
    )
  }

  getBounds(shape: PostItShape) {
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

  getRotatedBounds(shape: PostItShape) {
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }

  getCenter(shape: PostItShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  getBindingPoint(
    shape: PostItShape,
    fromShape: ArrowShape,
    point: number[],
    origin: number[],
    direction: number[],
    padding: number,
    anywhere: boolean
  ) {
    const bounds = this.getBounds(shape)

    const expandedBounds = Utils.expandBounds(bounds, padding)

    let bindingPoint: number[]
    let distance: number

    // The point must be inside of the expanded bounding box
    if (!Utils.pointInBounds(point, expandedBounds)) return

    // The point is inside of the shape, so we'll assume the user is
    // indicating a specific point inside of the shape.
    if (anywhere) {
      if (Vec.dist(point, this.getCenter(shape)) < 12) {
        bindingPoint = [0.5, 0.5]
      } else {
        bindingPoint = Vec.divV(Vec.sub(point, [expandedBounds.minX, expandedBounds.minY]), [
          expandedBounds.width,
          expandedBounds.height,
        ])
      }

      distance = 0
    } else {
      // TODO: What if the shape has a curve? In that case, should we
      // intersect the circle-from-three-points instead?

      // Find furthest intersection between ray from
      // origin through point and expanded bounds.

      // TODO: Make this a ray vs rounded rect intersection
      const intersection = Intersect.ray
        .bounds(origin, direction, expandedBounds)
        .filter((int) => int.didIntersect)
        .map((int) => int.points[0])
        .sort((a, b) => Vec.dist(b, origin) - Vec.dist(a, origin))[0]
      // The anchor is a point between the handle and the intersection
      const anchor = Vec.med(point, intersection)

      // If we're close to the center, snap to the center
      if (Vec.distanceToLineSegment(point, anchor, this.getCenter(shape)) < 12) {
        bindingPoint = [0.5, 0.5]
      } else {
        // Or else calculate a normalized point
        bindingPoint = Vec.divV(Vec.sub(anchor, [expandedBounds.minX, expandedBounds.minY]), [
          expandedBounds.width,
          expandedBounds.height,
        ])
      }

      if (Utils.pointInBounds(point, bounds)) {
        distance = 16
      } else {
        // If the binding point was close to the shape's center, snap to the center
        // Find the distance between the point and the real bounds of the shape
        distance = Math.max(
          16,
          Utils.getBoundsSides(bounds)
            .map((side) => Vec.distanceToLineSegment(side[1][0], side[1][1], point))
            .sort((a, b) => a - b)[0]
        )
      }
    }

    return {
      point: Vec.clampV(bindingPoint, 0, 1),
      distance,
    }
  }

  hitTestBounds(shape: PostItShape, bounds: TLBounds) {
    const rotatedCorners = Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)

    return (
      rotatedCorners.every((point) => Utils.pointInBounds(point, bounds)) ||
      Intersect.polyline.bounds(rotatedCorners, bounds).length > 0
    )
  }

  transform(
    shape: PostItShape,
    bounds: TLBounds,
    { initialShape, transformOrigin, scaleX, scaleY }: TLTransformInfo<PostItShape>
  ) {
    if (!shape.rotation && !shape.isAspectRatioLocked) {
      return {
        point: Vec.round([bounds.minX, bounds.minY]),
        size: Vec.round([bounds.width, bounds.height]),
      }
    } else {
      const size = Vec.round(
        Vec.mul(initialShape.size, Math.min(Math.abs(scaleX), Math.abs(scaleY)))
      )

      const point = Vec.round([
        bounds.minX +
          (bounds.width - shape.size[0]) *
            (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
        bounds.minY +
          (bounds.height - shape.size[1]) *
            (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
      ])

      const rotation =
        (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0)
          ? initialShape.rotation
            ? -initialShape.rotation
            : 0
          : initialShape.rotation

      return {
        size,
        point,
        rotation,
      }
    }
  }

  transformSingle(_shape: PostItShape, bounds: TLBounds) {
    return {
      size: Vec.round([bounds.width, bounds.height]),
      point: Vec.round([bounds.minX, bounds.minY]),
    }
  }
}
