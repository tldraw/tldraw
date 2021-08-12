import * as React from 'react'
import { useShapeTree } from '../hooks/useShapeTree'
import type { IShapeTreeNode, TLPage, TLPageState, TLShape } from '../../types'
import { Shape as ShapeComponent } from './shape'
import { useHandles, useRenderOnResize, useTLContext } from '../hooks'
import { Bounds } from './bounds'
import { BoundsBg } from './bounds/bounds-bg'
import { useSelection } from '../hooks'
import { Handles } from './handles'

interface PageProps<T extends TLShape> {
  page: TLPage<T>
  pageState: TLPageState
  hideBounds: boolean
  hideHandles: boolean
  hideIndicators: boolean
}

export function Page<T extends TLShape>({
  page,
  pageState,
  hideBounds,
  hideHandles,
  hideIndicators,
}: PageProps<T>): JSX.Element {
  const { callbacks, shapeUtils } = useTLContext()

  useRenderOnResize()

  const shapeTree = useShapeTree(page, pageState, shapeUtils, callbacks.onChange)

  const { shapeWithHandles } = useHandles(page, pageState)

  const { bounds, isLocked, rotation } = useSelection(page, pageState, shapeUtils)

  const {
    selectedIds,
    hoveredId,
    camera: { zoom },
  } = pageState

  return (
    <>
      {bounds && !hideBounds && <BoundsBg bounds={bounds} rotation={rotation} />}
      {shapeTree.map((node) => (
        <ShapeNode key={node.shape.id} {...node} />
      ))}
      {bounds && !hideBounds && (
        <Bounds zoom={zoom} bounds={bounds} isLocked={isLocked} rotation={rotation} />
      )}
      {!hideIndicators &&
        selectedIds.length > 1 &&
        selectedIds
          .filter(Boolean)
          .map((id) => (
            <ShapeIndicator key={'selected_' + id} shape={page.shapes[id]} variant="selected" />
          ))}
      {!hideIndicators && hoveredId && (
        <ShapeIndicator
          key={'hovered_' + hoveredId}
          shape={page.shapes[hoveredId]}
          variant="hovered"
        />
      )}
      {!hideHandles && shapeWithHandles && <Handles shape={shapeWithHandles} zoom={zoom} />}
    </>
  )
}

const ShapeIndicator = React.memo(
  ({ shape, variant }: { shape: TLShape; variant: 'selected' | 'hovered' }) => {
    const { shapeUtils } = useTLContext()
    const utils = shapeUtils[shape.type]

    const center = utils.getCenter(shape)
    const rotation = (shape.rotation || 0) * (180 / Math.PI)
    const transform = `rotate(${rotation}, ${center}) translate(${shape.point})`

    return (
      <g className={variant === 'selected' ? 'tl-selected' : 'tl-hovered'} transform={transform}>
        {shapeUtils[shape.type].renderIndicator(shape)}
      </g>
    )
  }
)

const ShapeNode = React.memo(
  ({ shape, children, isEditing, isDarkMode, isBinding, isCurrentParent }: IShapeTreeNode) => {
    return (
      <>
        <ShapeComponent
          shape={shape}
          isEditing={isEditing}
          isDarkMode={isDarkMode}
          isBinding={isBinding}
          isCurrentParent={isCurrentParent}
        />
        {children &&
          children.map((childNode) => <ShapeNode key={childNode.shape.id} {...childNode} />)}
      </>
    )
  }
)
