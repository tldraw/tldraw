/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLBoundsEdge, TLBoundsCorner, TLBounds } from '+types'
import { CenterHandle } from './center-handle'
import { RotateHandle } from './rotate-handle'
import { CornerHandle } from './corner-handle'
import { EdgeHandle } from './edge-handle'
import { CloneButtons } from './clone-buttons'
import { Container } from '+components/container'
import { SVGContainer } from '+components/svg-container'
import { LinkHandle } from './link-handle'

interface BoundsProps {
  zoom: number
  bounds: TLBounds
  rotation: number
  isLocked: boolean
  isHidden: boolean
  isLinked: boolean
  showCloneButtons: boolean
  viewportWidth: number
  children?: React.ReactNode
}

export const Bounds = React.memo(
  ({
    zoom,
    bounds,
    viewportWidth,
    rotation,
    isHidden,
    isLocked,
    isLinked,
    showCloneButtons,
  }: BoundsProps): JSX.Element => {
    // Touch target size
    const targetSize = (viewportWidth < 768 ? 16 : 8) / zoom
    // Handle size
    const size = 8 / zoom

    const smallDimension = Math.min(bounds.width, bounds.height) * zoom
    // If the bounds are small, don't show the rotate handle
    const showRotateHandle = !isHidden && !isLocked && smallDimension > 32
    // If the bounds are very small, don't show the edge handles
    const showEdgeHandles = !isHidden && !isLocked && smallDimension > 24
    // If the bounds are very very small, don't show the corner handles
    const showCornerHandles = !isHidden && !isLocked && smallDimension > 20

    return (
      <Container bounds={bounds} rotation={rotation}>
        <SVGContainer>
          <CenterHandle bounds={bounds} isLocked={isLocked} isHidden={isHidden} />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Top}
            isHidden={!showEdgeHandles}
          />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Right}
            isHidden={!showEdgeHandles}
          />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Bottom}
            isHidden={!showEdgeHandles}
          />
          <EdgeHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            edge={TLBoundsEdge.Left}
            isHidden={!showEdgeHandles}
          />
          <CornerHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            isHidden={isHidden || !showCornerHandles}
            corner={TLBoundsCorner.TopLeft}
          />
          <CornerHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            isHidden={isHidden || !showCornerHandles}
            corner={TLBoundsCorner.TopRight}
          />
          <CornerHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            isHidden={isHidden || !showCornerHandles}
            corner={TLBoundsCorner.BottomRight}
          />
          <CornerHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            isHidden={isHidden || !showCornerHandles}
            corner={TLBoundsCorner.BottomLeft}
          />
          <RotateHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            isHidden={!showEdgeHandles || !showRotateHandle}
          />
          {showCloneButtons && <CloneButtons bounds={bounds} />}
          {isLinked && (
            <LinkHandle
              targetSize={targetSize}
              size={size}
              bounds={bounds}
              isHidden={!showEdgeHandles || !showRotateHandle}
            />
          )}
        </SVGContainer>
      </Container>
    )
  }
)
