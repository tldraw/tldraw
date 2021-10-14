import * as React from 'react'
import { SVGContainer, TLBounds, Utils, TLTransformInfo, ShapeUtil } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { intersectBoundsBounds, intersectBoundsPolyline } from '@tldraw/intersect'
import { getStrokeOutlinePoints, getStrokePoints, StrokeOptions } from 'perfect-freehand'
import { defaultStyle, getShapeStyle } from '~shape/shape-styles'
import { DrawShape, DashStyle, TLDrawShapeType, TLDrawMeta } from '~types'

const pointsBoundsCache = new WeakMap<DrawShape['points'], TLBounds>([])
const shapeBoundsCache = new Map<string, TLBounds>()
const rotatedCache = new WeakMap<DrawShape, number[][]>([])
const pointCache: Record<string, number[]> = {}

export const Draw = new ShapeUtil<DrawShape, SVGSVGElement, TLDrawMeta>(() => ({
  type: TLDrawShapeType.Draw,

  defaultProps: {
    id: 'id',
    type: TLDrawShapeType.Draw,
    name: 'Draw',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    points: [],
    rotation: 0,
    style: defaultStyle,
  },

  Component({ shape, meta, events }, ref) {
    const { points, style } = shape

    const polygonPathData = React.useMemo(() => {
      return getFillPath(shape)
    }, [points, style.size])

    const pathData = React.useMemo(() => {
      return style.dash === DashStyle.Draw
        ? getDrawStrokePathData(shape, false)
        : getSolidStrokePathData(shape, false)
    }, [points, style.size, style.dash, false])

    const styles = getShapeStyle(style, meta.isDarkMode)

    const strokeWidth = styles.strokeWidth

    // For very short lines, draw a point instead of a line
    const bounds = this.getBounds(shape)

    const verySmall = bounds.width <= strokeWidth / 2 && bounds.height <= strokeWidth / 2

    if (verySmall) {
      const sw = 1 + strokeWidth

      return (
        <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
          <circle r={sw} fill={styles.stroke} stroke={styles.stroke} pointerEvents="all" />
        </SVGContainer>
      )
    }

    const shouldFill =
      style.isFilled &&
      points.length > 3 &&
      Vec.dist(points[0], points[points.length - 1]) < +styles.strokeWidth * 2

    if (shape.style.dash === DashStyle.Draw) {
      return (
        <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
          {shouldFill && (
            <path
              d={polygonPathData}
              stroke="none"
              fill={styles.fill}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="fill"
            />
          )}
          <path
            d={pathData}
            fill={styles.stroke}
            stroke={styles.stroke}
            strokeWidth={styles.strokeWidth / 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            pointerEvents="all"
          />
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
        <path
          d={pathData}
          fill={shouldFill ? styles.fill : 'none'}
          stroke="none"
          strokeWidth={Math.min(4, strokeWidth * 2)}
          strokeLinejoin="round"
          strokeLinecap="round"
          pointerEvents={shouldFill ? 'all' : 'stroke'}
        />
        <path
          d={pathData}
          fill="none"
          stroke={styles.stroke}
          strokeWidth={sw}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinejoin="round"
          strokeLinecap="round"
          pointerEvents="stroke"
        />
      </SVGContainer>
    )
  },

  Indicator({ shape }) {
    const { points } = shape

    const pathData = React.useMemo(() => {
      return getSolidStrokePathData(shape, false)
    }, [points])

    const bounds = this.getBounds(shape)

    const verySmall = bounds.width < 4 && bounds.height < 4

    if (verySmall) {
      return <circle x={bounds.width / 2} y={bounds.height / 2} r={1} />
    }

    return <path d={pathData} />
  },

  getBounds(shape: DrawShape): TLBounds {
    // return Utils.translateBounds(Utils.getBoundsFromPoints(shape.points), shape.point)

    // The goal here is to avoid recalculating the bounds from the
    // points array, which is expensive. However, we still need a
    // new bounds if the point has changed, but we will reuse the
    // previous bounds-from-points result if we can.

    const pointsHaveChanged = !pointsBoundsCache.has(shape.points)
    const pointHasChanged = !(pointCache[shape.id] === shape.point)

    if (pointsHaveChanged) {
      // If the points have changed, then bust the points cache
      const bounds = Utils.getBoundsFromPoints(shape.points)
      pointsBoundsCache.set(shape.points, bounds)
      shapeBoundsCache.set(shape.id, Utils.translateBounds(bounds, shape.point))
      pointCache[shape.id] = shape.point
    } else if (pointHasChanged && !pointsHaveChanged) {
      // If the point have has changed, then bust the point cache
      pointCache[shape.id] = shape.point
      shapeBoundsCache.set(
        shape.id,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        Utils.translateBounds(pointsBoundsCache.get(shape.points)!, shape.point)
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return shapeBoundsCache.get(shape.id)!
  },

  shouldRender(prev: DrawShape, next: DrawShape): boolean {
    return next.points !== prev.points || next.style !== prev.style
  },

  hitTestBounds(shape: DrawShape, brushBounds: TLBounds): boolean {
    // Test axis-aligned shape
    if (!shape.rotation) {
      const bounds = this.getBounds(shape)

      return (
        Utils.boundsContain(brushBounds, bounds) ||
        ((Utils.boundsContain(bounds, brushBounds) ||
          intersectBoundsBounds(bounds, brushBounds).length > 0) &&
          intersectBoundsPolyline(
            Utils.translateBounds(brushBounds, Vec.neg(shape.point)),
            shape.points
          ).length > 0)
      )
    }

    // Test rotated shape
    const rBounds = this.getRotatedBounds(shape)

    const rotatedBounds = Utils.getFromCache(rotatedCache, shape, () => {
      const c = Utils.getBoundsCenter(Utils.getBoundsFromPoints(shape.points))
      return shape.points.map((pt) => Vec.rotWith(pt, c, shape.rotation || 0))
    })

    return (
      Utils.boundsContain(brushBounds, rBounds) ||
      intersectBoundsPolyline(
        Utils.translateBounds(brushBounds, Vec.neg(shape.point)),
        rotatedBounds
      ).length > 0
    )
  },

  transform(
    shape: DrawShape,
    bounds: TLBounds,
    { initialShape, scaleX, scaleY }: TLTransformInfo<DrawShape>
  ): Partial<DrawShape> {
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
  },
}))

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

const STREAMLINE = 0.65

const simulatePressureSettings: StrokeOptions = {
  easing: (t) => Math.sin((t * Math.PI) / 2),
  simulatePressure: true,
}

const realPressureSettings: StrokeOptions = {
  easing: (t) => t * t,
  simulatePressure: false,
}

function getOptions(shape: DrawShape, isComplete: boolean) {
  const styles = getShapeStyle(shape.style)

  const options: StrokeOptions = {
    size: 1 + styles.strokeWidth * 1.5,
    thinning: 0.65,
    streamline: STREAMLINE,
    smoothing: 0.65,
    ...(shape.points[1][2] === 0.5 ? simulatePressureSettings : realPressureSettings),
    last: isComplete,
  }

  return options
}

function getFillPath(shape: DrawShape) {
  if (shape.points.length < 2) return ''

  return Utils.getSvgPathFromStroke(
    getStrokePoints(shape.points, getOptions(shape, true)).map((pt) => pt.point)
  )
}

function getDrawStrokePoints(shape: DrawShape, options: StrokeOptions) {
  return getStrokePoints(shape.points, options)
}

/**
 * Get path data for a stroke with the DashStyle.Draw dash style.
 */
function getDrawStrokePathData(shape: DrawShape, isComplete: boolean) {
  if (shape.points.length < 2) return ''

  const options = getOptions(shape, isComplete)

  const strokePoints = getDrawStrokePoints(shape, options)

  const stroke = getStrokeOutlinePoints(strokePoints, options)

  const path = Utils.getSvgPathFromStroke(stroke)

  return path
}

/**
 * Get SVG path data for a shape that has a DashStyle other than DashStyles.Draw.
 */
function getSolidStrokePathData(shape: DrawShape, isComplete: boolean) {
  const { points } = shape

  if (points.length < 2) return 'M 0 0 L 0 0'

  const options = getOptions(shape, isComplete)

  const strokePoints = getDrawStrokePoints(shape, options).map((pt) => pt.point.slice(0, 2))

  const path = Utils.getSvgPathFromStroke(strokePoints, false)

  return path
}
