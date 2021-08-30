import * as React from 'react'
import { TLBounds, Utils, Vec, TLTransformInfo, Intersect } from '@tldraw/core'
import { getShapeStyle, getFontSize, getFontStyle, defaultStyle } from '~shape/shape-styles'
import {
  TextShape,
  TLDrawShapeUtil,
  TLDrawShapeType,
  TLDrawRenderInfo,
  TLDrawToolType,
} from '~types'
import styled from '~styles'
import TextAreaUtils from './text-utils'

function normalizeText(text: string) {
  return text.replace(/\r?\n|\r/g, '\n')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mdiv: any

function getMeasurementDiv() {
  // A div used for measurement
  document.getElementById('__textMeasure')?.remove()

  const mdiv = document.createElement('pre')
  mdiv.id = '__textMeasure'

  Object.assign(mdiv.style, {
    whiteSpace: 'pre',
    width: 'auto',
    border: '1px solid red',
    padding: '4px',
    margin: '0px',
    opacity: '0',
    position: 'absolute',
    top: '-500px',
    left: '0px',
    zIndex: '9999',
    pointerEvents: 'none',
    userSelect: 'none',
    alignmentBaseline: 'mathematical',
    dominantBaseline: 'mathematical',
  })

  mdiv.tabIndex = -1

  document.body.appendChild(mdiv)
  return mdiv
}

if (typeof window !== 'undefined') {
  getMeasurementDiv()
}

export class Text extends TLDrawShapeUtil<TextShape> {
  type = TLDrawShapeType.Text as const
  toolType = TLDrawToolType.Text
  canChangeAspectRatio = false
  isEditableText = true
  canBind = true

  pathCache = new WeakMap<number[], string>([])

  defaultProps = {
    id: 'id',
    type: TLDrawShapeType.Text as const,
    name: 'Text',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    rotation: 0,
    text: 'hi',
    style: defaultStyle,
  }

  shouldRender(prev: TextShape, next: TextShape): boolean {
    return (
      next.text !== prev.text || next.style.scale !== prev.style.scale || next.style !== prev.style
    )
  }

  render(
    shape: TextShape,
    {
      ref,
      meta,
      isEditing,
      onTextBlur,
      onTextChange,
      onTextFocus,
      onTextKeyDown,
      onTextKeyUp,
    }: TLDrawRenderInfo
  ): JSX.Element {
    const { id, text, style } = shape
    const styles = getShapeStyle(style, meta.isDarkMode)
    const font = getFontStyle(shape.style)

    const bounds = this.getBounds(shape)

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      onTextChange?.(id, normalizeText(e.currentTarget.value))
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      onTextKeyDown?.(id, e.key)

      if (e.key === 'Escape') return

      e.stopPropagation()

      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          TextAreaUtils.unindent(e.currentTarget)
        } else {
          TextAreaUtils.indent(e.currentTarget)
        }

        onTextChange?.(id, normalizeText(e.currentTarget.value))
      }
    }

    function handleKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      onTextKeyUp?.(id, e.key)
    }

    function handleBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
      if (isEditing) {
        e.currentTarget.focus()
        e.currentTarget.select()
        return
      }

      setTimeout(() => {
        onTextBlur?.(id)
      }, 0)
    }

    function handleFocus(e: React.FocusEvent<HTMLTextAreaElement>) {
      e.currentTarget.select()
      onTextFocus?.(id)
    }

    function handlePointerDown() {
      if (ref && ref.current.selectionEnd !== 0) {
        ref.current.selectionEnd = 0
      }
    }

    const fontSize = getFontSize(shape.style.size) * (shape.style.scale || 1)
    const lineHeight = fontSize * 1.4

    if (!isEditing) {
      return (
        <>
          {/* {isBinding && (
            <BindingIndicator
              as="rect"
              x={-32}
              y={-32}
              width={bounds.width + 64}
              height={bounds.height + 64}
            />
          )} */}
          {text.split('\n').map((str, i) => (
            <text
              key={i}
              x={4}
              y={4 + fontSize / 2 + i * lineHeight}
              fontFamily="Verveine Regular"
              fontStyle="normal"
              fontWeight="500"
              fontSize={fontSize}
              width={bounds.width}
              height={bounds.height}
              fill={styles.stroke}
              color={styles.stroke}
              stroke="none"
              xmlSpace="preserve"
              dominantBaseline="mathematical"
              alignmentBaseline="mathematical"
            >
              {str}
            </text>
          ))}
        </>
      )
    }

    if (ref === undefined) {
      throw Error('This component should receive a ref when editing.')
    }

    return (
      <foreignObject
        width={bounds.width}
        height={bounds.height}
        pointerEvents="none"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <StyledTextArea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          style={{
            font,
            color: styles.stroke,
          }}
          name="text"
          defaultValue={text}
          tabIndex={-1}
          autoComplete="false"
          autoCapitalize="false"
          autoCorrect="false"
          autoSave="false"
          placeholder=""
          color={styles.stroke}
          autoFocus={true}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onChange={handleChange}
          onPointerDown={handlePointerDown}
        />
      </foreignObject>
    )
  }

  renderIndicator(): JSX.Element | null {
    return null
    // if (isEditing) return null

    // const { width, height } = this.getBounds(shape)

    // return <rect className="tl-selected" width={width} height={height} />
  }

  getBounds(shape: TextShape): TLBounds {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      if (!mdiv) {
        // We're in SSR
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
      }

      mdiv.innerHTML = `${shape.text}&zwj;`
      mdiv.style.font = getFontStyle(shape.style)

      const [width, height] = [mdiv.offsetWidth, mdiv.offsetHeight]

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

  getRotatedBounds(shape: TextShape): TLBounds {
    return Utils.getBoundsFromPoints(Utils.getRotatedCorners(this.getBounds(shape), shape.rotation))
  }

  getCenter(shape: TextShape): number[] {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  hitTest(shape: TextShape, point: number[]): boolean {
    return Utils.pointInBounds(point, this.getBounds(shape))
  }

  hitTestBounds(shape: TextShape, bounds: TLBounds): boolean {
    const rotatedCorners = Utils.getRotatedCorners(this.getBounds(shape), shape.rotation)

    return (
      rotatedCorners.every((point) => Utils.pointInBounds(point, bounds)) ||
      Intersect.polyline.bounds(rotatedCorners, bounds).length > 0
    )
  }

  transform(
    _shape: TextShape,
    bounds: TLBounds,
    { initialShape, scaleX, scaleY }: TLTransformInfo<TextShape>
  ): Partial<TextShape> {
    const {
      isAspectRatioLocked,
      rotation = 0,
      style: { scale = 1 },
    } = initialShape

    if (!rotation && !isAspectRatioLocked) {
      return {
        point: [bounds.minX, bounds.minY],
        style: {
          ...initialShape.style,
          scale: scale * Math.abs(scaleX),
        },
      }
    }

    return {
      point: [bounds.minX, bounds.minY],
      rotation:
        (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0) ? -(rotation || 0) : rotation,
      style: {
        ...initialShape.style,
        scale: scale * Math.abs(Math.min(scaleX, scaleY)),
      },
    }
  }

  transformSingle(
    _shape: TextShape,
    bounds: TLBounds,
    { initialShape, scaleX }: TLTransformInfo<TextShape>
  ): Partial<TextShape> {
    const {
      style: { scale = 1 },
    } = initialShape

    return {
      point: Vec.round([bounds.minX, bounds.minY]),
      style: {
        ...initialShape.style,
        scale: scale * Math.abs(scaleX),
      },
    }
  }

  onBoundsReset(shape: TextShape): Partial<TextShape> {
    const center = this.getCenter(shape)

    this.boundsCache.delete(shape)

    const newCenter = this.getCenter(shape)

    return {
      style: {
        ...shape.style,
        scale: 1,
      },
      point: Vec.round(Vec.add(shape.point, Vec.sub(center, newCenter))),
    }
  }

  onStyleChange(shape: TextShape): Partial<TextShape> {
    const center = this.getCenter(shape)

    this.boundsCache.delete(shape)

    const newCenter = this.getCenter(shape)

    return {
      point: Vec.round(Vec.add(shape.point, Vec.sub(center, newCenter))),
    }
  }

  shouldDelete(shape: TextShape): boolean {
    return shape.text.length === 0
  }

  // getBindingPoint(shape, point, origin, direction, expandDistance) {
  //   const bounds = this.getBounds(shape)

  //   const expandedBounds = expandBounds(bounds, expandDistance)

  //   let bindingPoint: number[]
  //   let distance: number

  //   if (!HitTest.bounds(point, expandedBounds)) return

  //   // The point is inside of the box, so we'll assume the user is
  //   // indicating a specific point inside of the box.
  //   if (HitTest.bounds(point, bounds)) {
  //     bindingPoint = vec.divV(vec.sub(point, [expandedBounds.minX, expandedBounds.minY]), [
  //       expandedBounds.width,
  //       expandedBounds.height,
  //     ])

  //     distance = 0
  //   } else {
  //     // Find furthest intersection between ray from
  //     // origin through point and expanded bounds.
  //     const intersection = Intersect.ray
  //       .bounds(origin, direction, expandedBounds)
  //       .filter(int => int.didIntersect)
  //       .map(int => int.points[0])
  //       .sort((a, b) => vec.dist(b, origin) - vec.dist(a, origin))[0]

  //     // The anchor is a point between the handle and the intersection
  //     const anchor = vec.med(point, intersection)

  //     // Find the distance between the point and the real bounds of the shape
  //     const distanceFromShape = getBoundsSides(bounds)
  //       .map(side => vec.distanceToLineSegment(side[1][0], side[1][1], point))
  //       .sort((a, b) => a - b)[0]

  //     if (vec.distanceToLineSegment(point, anchor, this.getCenter(shape)) < 12) {
  //       // If we're close to the center, snap to the center
  //       bindingPoint = [0.5, 0.5]
  //     } else {
  //       // Or else calculate a normalized point
  //       bindingPoint = vec.divV(vec.sub(anchor, [expandedBounds.minX, expandedBounds.minY]), [
  //         expandedBounds.width,
  //         expandedBounds.height,
  //       ])
  //     }

  //     distance = distanceFromShape
  //   }

  //   return {
  //     point: bindingPoint,
  //     distance,
  //   }
  // }
}

const StyledTextArea = styled('textarea', {
  zIndex: 1,
  width: '100%',
  height: '100%',
  border: 'none',
  padding: '4px',
  whiteSpace: 'pre',
  alignmentBaseline: 'mathematical',
  dominantBaseline: 'mathematical',
  resize: 'none',
  minHeight: 1,
  minWidth: 1,
  lineHeight: 1.4,
  outline: 0,
  fontWeight: '500',
  backgroundColor: '$boundsBg',
  overflow: 'hidden',
  pointerEvents: 'all',
  backfaceVisibility: 'hidden',
  display: 'inline-block',
  userSelect: 'text',
  WebkitUserSelect: 'text',
  WebkitTouchCallout: 'none',
})
