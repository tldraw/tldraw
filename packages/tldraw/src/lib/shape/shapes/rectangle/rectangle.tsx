import * as React from 'react'
import { TLBounds, Utils, Vec, TLTransformInfo, TLRenderInfo, Intersect } from '@tldraw/core'
import getStroke from 'perfect-freehand'
import { getPerfectDashProps, defaultStyle, getShapeStyle } from '../../shape-styles'
import {
  RectangleShape,
  DashStyle,
  TLDrawShapeUtil,
  TLDrawShapeType,
  TLDrawToolType,
} from '../../shape-types'

export class Rectangle extends TLDrawShapeUtil<RectangleShape> {
  type = TLDrawShapeType.Rectangle as const
  toolType = TLDrawToolType.Bounds

  pathCache = new WeakMap<number[], string>([])

  defaultProps = {
    id: 'id',
    type: TLDrawShapeType.Rectangle as const,
    name: 'Rectangle',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    size: [1, 1],
    rotation: 0,
    radius: 0,
    style: defaultStyle,
  }

  render(shape: RectangleShape, { isBinding, isHovered, isDarkMode }: TLRenderInfo) {
    const { id, size, style } = shape
    const styles = getShapeStyle(style, isDarkMode)
    const strokeWidth = +styles.strokeWidth

    if (style.dash === DashStyle.Draw) {
      const pathData = Utils.getFromCache(this.pathCache, shape.size, () => renderPath(shape))

      return (
        <>
          {isBinding && (
            <rect
              className="tl-binding-indicator"
              x={strokeWidth / 2 - 32}
              y={strokeWidth / 2 - 32}
              width={Math.max(0, size[0] - strokeWidth / 2) + 64}
              height={Math.max(0, size[1] - strokeWidth / 2) + 64}
            />
          )}
          <rect
            x={+styles.strokeWidth / 2}
            y={+styles.strokeWidth / 2}
            width={Math.max(0, size[0] - strokeWidth)}
            height={Math.max(0, size[1] - strokeWidth)}
            fill={style.isFilled ? styles.fill : 'transparent'}
            stroke="none"
            pointerEvents="all"
          />
          <path
            d={pathData}
            fill={styles.stroke}
            stroke={styles.stroke}
            strokeWidth={styles.strokeWidth}
            filter={isHovered ? 'url(#expand)' : 'none'}
            pointerEvents="all"
          />
        </>
      )
    }

    const sw = strokeWidth * 1.618

    const w = Math.max(0, size[0] - sw / 2)
    const h = Math.max(0, size[1] - sw / 2)

    const strokes: [number[], number[], number][] = [
      [[sw / 2, sw / 2], [w, sw / 2], w - sw / 2],
      [[w, sw / 2], [w, h], h - sw / 2],
      [[w, h], [sw / 2, h], w - sw / 2],
      [[sw / 2, h], [sw / 2, sw / 2], h - sw / 2],
    ]

    const paths = strokes.map(([start, end, length], i) => {
      const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
        length,
        sw,
        shape.style.dash
      )

      return (
        <line
          key={id + '_' + i}
          x1={start[0]}
          y1={start[1]}
          x2={end[0]}
          y2={end[1]}
          stroke={styles.stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      )
    })

    return (
      <>
        {isBinding && (
          <rect
            className="tl-binding-indicator"
            x={sw / 2 - 32}
            y={sw / 2 - 32}
            width={w + 64}
            height={h + 64}
          />
        )}
        <rect
          x={sw / 2}
          y={sw / 2}
          width={w}
          height={h}
          fill={styles.fill}
          stroke="transparent"
          strokeWidth={sw}
          pointerEvents="all"
        />
        <g filter={isHovered ? 'url(#expand)' : 'none'} pointerEvents="stroke">
          {paths}
        </g>
      </>
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
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }

  getCenter(shape: RectangleShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTest(shape: RectangleShape, point: number[]) {
    return Utils.pointInBounds(point, this.getBounds(shape))
  }

  hitTestBounds(shape: RectangleShape, bounds: TLBounds) {
    const rotatedCorners = Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)

    return (
      rotatedCorners.every(point => Utils.pointInBounds(point, bounds)) ||
      Intersect.polyline.bounds(rotatedCorners, bounds).length > 0
    )
  }

  transform(
    shape: RectangleShape,
    bounds: TLBounds,
    { initialShape, transformOrigin, scaleX, scaleY }: TLTransformInfo<RectangleShape>
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

  transformSingle(shape: RectangleShape, bounds: TLBounds, info: TLTransformInfo<RectangleShape>) {
    return {
      size: Vec.round([bounds.width, bounds.height]),
      point: Vec.round([bounds.minX, bounds.minY]),
    }
  }
}

function renderPath(shape: RectangleShape) {
  const styles = getShapeStyle(shape.style)

  const getRandom = Utils.rng(shape.id)

  const strokeWidth = +styles.strokeWidth

  const baseOffset = strokeWidth / 2

  const offsets = Array.from(Array(4)).map(() => [
    getRandom() * baseOffset,
    getRandom() * baseOffset,
  ])

  const sw = strokeWidth

  const w = Math.max(0, shape.size[0] - sw / 2)
  const h = Math.max(0, shape.size[1] - sw / 2)

  const tl = Vec.add([sw / 2, sw / 2], offsets[0])
  const tr = Vec.add([w, sw / 2], offsets[1])
  const br = Vec.add([w, h], offsets[2])
  const bl = Vec.add([sw / 2, h], offsets[3])

  const lines = Utils.shuffleArr(
    [
      Vec.pointsBetween(tr, br),
      Vec.pointsBetween(br, bl),
      Vec.pointsBetween(bl, tl),
      Vec.pointsBetween(tl, tr),
    ],
    Math.floor(5 + getRandom() * 4)
  )

  const stroke = getStroke([...lines.flat().slice(2), ...lines[0], ...lines[0].slice(4)], {
    size: 1 + +styles.strokeWidth,
    thinning: 0.6,
    easing: t => t * t * t * t,
    end: { taper: +styles.strokeWidth * 20 },
    start: { taper: +styles.strokeWidth * 20 },
    simulatePressure: false,
  })

  return Utils.getSvgPathFromStroke(stroke)
}
