import * as React from 'react'
import { Utils, SVGContainer, TLBounds } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { defaultStyle, getShapeStyle } from '../shared/shape-styles'
import { DrawShape, DashStyle, TldrawShapeType, TldrawTransformInfo, TldrawMeta } from '~types'
import { TldrawShapeUtil } from '../TldrawShapeUtil'
import {
  intersectBoundsBounds,
  intersectBoundsPolyline,
  intersectLineSegmentBounds,
  intersectLineSegmentLineSegment,
} from '@tldraw/intersect'
import {
  getDrawStrokePathTldrawSnapshot,
  getFillPath,
  getSolidStrokePathTldrawSnapshot,
} from './drawHelpers'
import { GHOSTED_OPACITY } from '~constants'

type T = DrawShape
type E = SVGSVGElement

export class DrawUtil extends TldrawShapeUtil<T, E> {
  type = TldrawShapeType.Draw as const

  pointsBoundsCache = new WeakMap<T['points'], TLBounds>([])

  shapeBoundsCache = new Map<string, TLBounds>()

  rotatedCache = new WeakMap<T, number[][]>([])

  pointCache: Record<string, number[]> = {}

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TldrawShapeType.Draw,
        name: 'Draw',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        rotation: 0,
        style: defaultStyle,
        points: [],
        isComplete: false,
      },
      props
    )
  }

  Component = TldrawShapeUtil.Component<T, E, TldrawMeta>(
    ({ shape, meta, isGhost, events }, ref) => {
      const { points, style, isComplete } = shape

      const polygonPathTldrawSnapshot = React.useMemo(() => {
        return getFillPath(shape)
      }, [points, style.size])

      const pathTldrawSnapshot = React.useMemo(() => {
        return style.dash === DashStyle.Draw
          ? getDrawStrokePathTldrawSnapshot(shape)
          : getSolidStrokePathTldrawSnapshot(shape)
      }, [points, style.size, style.dash, isComplete])

      const styles = getShapeStyle(style, meta.isDarkMode)
      const { stroke, fill, strokeWidth } = styles

      // For very short lines, draw a point instead of a line
      const bounds = this.getBounds(shape)

      const verySmall = bounds.width <= strokeWidth / 2 && bounds.height <= strokeWidth / 2

      if (verySmall) {
        const sw = 1 + strokeWidth

        return (
          <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
            <circle r={sw} fill={stroke} stroke={stroke} pointerEvents="all" />
          </SVGContainer>
        )
      }

      const shouldFill =
        style.isFilled &&
        points.length > 3 &&
        Vec.dist(points[0], points[points.length - 1]) < strokeWidth * 2

      if (shape.style.dash === DashStyle.Draw) {
        return (
          <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
            <g opacity={isGhost ? GHOSTED_OPACITY : 1}>
              {shouldFill && (
                <path
                  d={polygonPathTldrawSnapshot}
                  stroke="none"
                  fill={fill}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="fill"
                />
              )}
              <path
                d={pathTldrawSnapshot}
                fill={stroke}
                stroke={stroke}
                strokeWidth={strokeWidth / 2}
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="all"
              />
            </g>
          </SVGContainer>
        )
      }

      // For solid, dash and dotted lines, draw a regular stroke path

      const strokeDasharray = {
        [DashStyle.Draw]: 'none',
        [DashStyle.Solid]: `none`,
        [DashStyle.Dotted]: `0.1 ${strokeWidth * 4}`,
        [DashStyle.Dashed]: `${strokeWidth * 4} ${strokeWidth * 4}`,
      }[style.dash]

      const strokeDashoffset = {
        [DashStyle.Draw]: 'none',
        [DashStyle.Solid]: `none`,
        [DashStyle.Dotted]: `0`,
        [DashStyle.Dashed]: `0`,
      }[style.dash]

      const sw = 1 + strokeWidth * 1.5

      return (
        <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
          <g opacity={isGhost ? GHOSTED_OPACITY : 1}>
            <path
              d={pathTldrawSnapshot}
              fill={shouldFill ? fill : 'none'}
              stroke="none"
              strokeWidth={Math.min(4, strokeWidth * 2)}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents={shouldFill ? 'all' : 'stroke'}
            />
            <path
              d={pathTldrawSnapshot}
              fill="none"
              stroke={stroke}
              strokeWidth={sw}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="stroke"
            />
          </g>
        </SVGContainer>
      )
    }
  )

  Indicator = TldrawShapeUtil.Indicator<T>(({ shape }) => {
    const { points } = shape

    const pathTldrawSnapshot = React.useMemo(() => {
      return getSolidStrokePathTldrawSnapshot(shape)
    }, [points])

    const bounds = this.getBounds(shape)

    const verySmall = bounds.width < 4 && bounds.height < 4

    if (verySmall) {
      return <circle x={bounds.width / 2} y={bounds.height / 2} r={1} />
    }

    return <path d={pathTldrawSnapshot} />
  })

  transform = (
    shape: T,
    bounds: TLBounds,
    { initialShape, scaleX, scaleY }: TldrawTransformInfo<T>
  ): Partial<T> => {
    const initialShapeBounds = Utils.getFromCache(this.boundsCache, initialShape, () =>
      Utils.getBoundsFromPoints(initialShape.points)
    )

    const points = initialShape.points.map(([x, y, r]) => {
      return [
        bounds.width *
          (scaleX < 0 // * sin?
            ? 1 - x / initialShapeBounds.width
            : x / initialShapeBounds.width),
        bounds.height *
          (scaleY < 0 // * cos?
            ? 1 - y / initialShapeBounds.height
            : y / initialShapeBounds.height),
        r,
      ]
    })

    const newBounds = Utils.getBoundsFromPoints(shape.points)

    const point = Vec.sub([bounds.minX, bounds.minY], [newBounds.minX, newBounds.minY])

    return {
      points,
      point,
    }
  }

  getBounds = (shape: T) => {
    // The goal here is to avoid recalculating the bounds from the
    // points array, which is expensive. However, we still need a
    // new bounds if the point has changed, but we will reuse the
    // previous bounds-from-points result if we can.

    const pointsHaveChanged = !this.pointsBoundsCache.has(shape.points)
    const pointHasChanged = !(this.pointCache[shape.id] === shape.point)

    if (pointsHaveChanged) {
      // If the points have changed, then bust the points cache
      const bounds = Utils.getBoundsFromPoints(shape.points)
      this.pointsBoundsCache.set(shape.points, bounds)
      this.shapeBoundsCache.set(shape.id, Utils.translateBounds(bounds, shape.point))
      this.pointCache[shape.id] = shape.point
    } else if (pointHasChanged && !pointsHaveChanged) {
      // If the point have has changed, then bust the point cache
      this.pointCache[shape.id] = shape.point
      this.shapeBoundsCache.set(
        shape.id,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        Utils.translateBounds(this.pointsBoundsCache.get(shape.points)!, shape.point)
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.shapeBoundsCache.get(shape.id)!
  }

  shouldRender = (prev: T, next: T) => {
    return (
      next.points !== prev.points ||
      next.style !== prev.style ||
      next.isComplete !== prev.isComplete
    )
  }

  hitTestLineSegment = (shape: T, A: number[], B: number[]): boolean => {
    const { points, point } = shape
    const ptA = Vec.sub(A, point)
    const ptB = Vec.sub(B, point)
    const bounds = this.getBounds(shape)

    if (intersectLineSegmentBounds(ptA, ptB, bounds)) {
      for (let i = 1; i < points.length; i++) {
        if (intersectLineSegmentLineSegment(points[i - 1], points[i], ptA, ptB).didIntersect) {
          return true
        }
      }
    }

    return false
  }

  hitTestBounds = (shape: T, bounds: TLBounds) => {
    // Test axis-aligned shape
    if (!shape.rotation) {
      const shapeBounds = this.getBounds(shape)

      return (
        Utils.boundsContain(bounds, shapeBounds) ||
        ((Utils.boundsContain(shapeBounds, bounds) ||
          intersectBoundsBounds(shapeBounds, bounds).length > 0) &&
          intersectBoundsPolyline(Utils.translateBounds(bounds, Vec.neg(shape.point)), shape.points)
            .length > 0)
      )
    }

    // Test rotated shape
    const rBounds = this.getRotatedBounds(shape)

    const rotatedBounds = Utils.getFromCache(this.rotatedCache, shape, () => {
      const c = Utils.getBoundsCenter(Utils.getBoundsFromPoints(shape.points))
      return shape.points.map((pt) => Vec.rotWith(pt, c, shape.rotation || 0))
    })

    return (
      Utils.boundsContain(bounds, rBounds) ||
      intersectBoundsPolyline(Utils.translateBounds(bounds, Vec.neg(shape.point)), rotatedBounds)
        .length > 0
    )
  }
}
