import * as React from 'react'
import type { TLBinding, TLPage, TLPageState, TLShape } from '+types'
import { useSelection, useShapeTree, useHandles, useRenderOnResize, useTLContext } from '+hooks'
import { Bounds } from '+components/bounds'
import { BoundsBg } from '+components/bounds/bounds-bg'
import { Handles } from '+components/handles'
import { ShapeNode } from '+components/shape'
import { ShapeIndicator } from '+components/shape-indicator'

interface PageProps<T extends TLShape> {
  page: TLPage<T, TLBinding>
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
