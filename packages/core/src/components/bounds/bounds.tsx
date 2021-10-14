/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLBoundsEdge, TLBoundsCorner, TLBounds } from '+types'
import { CenterHandle } from './center-handle'
import { RotateHandle } from './rotate-handle'
import { CornerHandle } from './corner-handle'
import { EdgeHandle } from './edge-handle'
import { Container } from '+components/container'
import { SVGContainer } from '+components/svg-container'

interface BoundsProps {
  zoom: number
  bounds: TLBounds
  rotation: number
  isLocked: boolean
  isHidden: boolean
  viewportWidth: number
}

export const Bounds = React.memo(
  ({ zoom, bounds, viewportWidth, rotation, isHidden, isLocked }: BoundsProps): JSX.Element => {
    // Touch target size
    const targetSize = (viewportWidth < 768 ? 16 : 8) / zoom
    // Handle size
    const size = 8 / zoom

    const smallDimension = Math.min(bounds.width, bounds.height) * zoom
    // If the bounds are small, don't show the rotate handle
    const showRotateHandle = !isHidden && !isLocked && smallDimension > 32
    // If the bounds are very small, don't show the corner handles
    const showHandles = !isHidden && !isLocked && smallDimension > 16

    return (
      <Container bounds={bounds} rotation={rotation}>
        <SVGContainer opacity={isHidden ? 0 : 1}>
          <CenterHandle bounds={bounds} isLocked={isLocked} />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Top}
            isHidden={!showHandles}
          />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Right}
            isHidden={!showHandles}
          />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Bottom}
            isHidden={!showHandles}
          />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Left}
            isHidden={!showHandles}
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
          <RotateHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            isHidden={!showHandles || !showRotateHandle}
          />
        </SVGContainer>
      </Container>
    )
  }
)
