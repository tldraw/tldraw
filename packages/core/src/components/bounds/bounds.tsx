/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLBoundsEdge, TLBoundsCorner, TLBounds } from '+types'
import { CenterHandle } from './center-handle'
import { RotateHandle } from './rotate-handle'
import { CornerHandle } from './corner-handle'
import { EdgeHandle } from './edge-handle'
import { usePosition } from '+hooks'
import { Container } from '+components/container'
import { SVGContainer } from '+components/svg-container'

interface BoundsProps {
  zoom: number
  bounds: TLBounds
  rotation: number
  isLocked: boolean
  viewportWidth: number
}

// function setTransform(elm: SVGSVGElement, padding: number, bounds: TLBounds, rotation: number) {
//   const center = Utils.getBoundsCenter(bounds)
//   const transform = `
//   rotate(${rotation * (180 / Math.PI)},${center})
//   translate(${bounds.minX - padding},${bounds.minY - padding})
//   rotate(${(bounds.rotation || 0) * (180 / Math.PI)},0,0)`
//   elm.setAttribute('transform', transform)
//   elm.setAttribute('width', bounds.width + padding * 2 + 'px')
//   elm.setAttribute('height', bounds.height + padding * 2 + 'px')
// }

// function setTransform(elm: HTMLDivElement, bounds: TLBounds, rotation = 0) {
//   const transform = `
//   translate(calc(${bounds.minX}px - var(--tl-padding)),calc(${bounds.minY}px - var(--tl-padding)))
//   rotate(${rotation + (bounds.rotation || 0)}rad)
//   `
//   elm.style.setProperty('transform', transform)
//   elm.style.setProperty('width', `calc(${bounds.width}px + (var(--tl-padding) * 2))`)
//   elm.style.setProperty('height', `calc(${bounds.height}px + (var(--tl-padding) * 2))`)
// }

export function Bounds({
  zoom,
  bounds,
  viewportWidth,
  rotation,
  isLocked,
}: BoundsProps): JSX.Element {
  const targetSize = (viewportWidth < 768 ? 16 : 8) / zoom // Touch target size
  const size = 8 / zoom // Touch target size

  return (
    <Container bounds={bounds} rotation={rotation}>
      <SVGContainer>
        <CenterHandle bounds={bounds} isLocked={isLocked} />
        {!isLocked && (
          <>
            <EdgeHandle
              targetSize={targetSize}
              size={size}
              bounds={bounds}
              edge={TLBoundsEdge.Top}
            />
            <EdgeHandle
              targetSize={targetSize}
              size={size}
              bounds={bounds}
              edge={TLBoundsEdge.Right}
            />
            <EdgeHandle
              targetSize={targetSize}
              size={size}
              bounds={bounds}
              edge={TLBoundsEdge.Bottom}
            />
            <EdgeHandle
              targetSize={targetSize}
              size={size}
              bounds={bounds}
              edge={TLBoundsEdge.Left}
            />
            <CornerHandle
              targetSize={targetSize}
              size={size}
              bounds={bounds}
              corner={TLBoundsCorner.TopLeft}
            />
            <CornerHandle
              targetSize={targetSize}
              size={size}
              bounds={bounds}
              corner={TLBoundsCorner.TopRight}
            />
            <CornerHandle
              targetSize={targetSize}
              size={size}
              bounds={bounds}
              corner={TLBoundsCorner.BottomRight}
            />
            <CornerHandle
              targetSize={targetSize}
              size={size}
              bounds={bounds}
              corner={TLBoundsCorner.BottomLeft}
            />
            <RotateHandle targetSize={targetSize} size={size} bounds={bounds} />
          </>
        )}
      </SVGContainer>
    </Container>
  )
}
