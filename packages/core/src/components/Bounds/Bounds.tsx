import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { Container } from '~components/Container'
import { SVGContainer } from '~components/SVGContainer'
import { TLBounds, TLBoundsCorner, TLBoundsEdge } from '~types'
import { CenterHandle } from './CenterHandle'
import { CloneButtons } from './CloneButtons'
import { CornerHandle } from './CornerHandle'
import { EdgeHandle } from './EdgeHandle'
import { LinkHandle } from './LinkHandle'
import { RotateHandle } from './RotateHandle'

interface BoundsProps {
  zoom: number
  bounds: TLBounds
  rotation: number
  isLocked: boolean
  isHidden: boolean
  hideCloneHandles: boolean
  hideRotateHandle: boolean
  hideBindingHandles: boolean
  hideResizeHandles: boolean
  viewportWidth: number
  children?: React.ReactElement
}

export const Bounds = observer<BoundsProps>(function Bounds({
  zoom,
  bounds,
  viewportWidth,
  rotation,
  isHidden,
  isLocked,
  hideCloneHandles,
  hideResizeHandles,
  hideRotateHandle,
  hideBindingHandles,
}: BoundsProps) {
  // Touch target size
  const targetSize = (viewportWidth < 768 ? 16 : 8) / zoom
  // Handle size
  const size = 8 / zoom

  const smallDimension = Math.min(bounds.width, bounds.height) * zoom
  // If the bounds are small, don't show the rotate handle
  const showRotateHandle = !hideRotateHandle && !isHidden && !isLocked && smallDimension > 32
  // If the bounds are very small, don't show the edge handles
  const showEdgeHandles = !isHidden && !isLocked && smallDimension > 24
  // If the bounds are very very small, don't show the corner handles
  const showCornerHandles = !isHidden && !isLocked && smallDimension > 20
  // If the bounds are very small, don't show the clone handles
  const showCloneHandles = !hideCloneHandles && smallDimension > 24
  // Unless we're hiding the resize handles, show them
  const showResizeHandles = !hideResizeHandles && !isLocked

  return (
    <Container bounds={bounds} rotation={rotation}>
      <SVGContainer>
        <CenterHandle bounds={bounds} isLocked={isLocked} isHidden={isHidden} />
        {showResizeHandles ? (
          <>
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
          </>
        ) : null}
        {showRotateHandle && (
          <RotateHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            isHidden={!showEdgeHandles}
          />
        )}
        {showCloneHandles && <CloneButtons bounds={bounds} targetSize={targetSize} size={size} />}
        {!hideBindingHandles && (
          <LinkHandle
            targetSize={targetSize}
            size={size}
            bounds={bounds}
            isHidden={!showEdgeHandles}
          />
        )}
      </SVGContainer>
    </Container>
  )
})
