/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import type { TLBinding, TLPage, TLPageState, TLShape, TLShapeUtil } from '+types'
import { useSelection, useShapeTree, useTLContext } from '+hooks'
import { Bounds } from '+components/bounds'
import { BoundsBg } from '+components/bounds/bounds-bg'
import { Handles } from '+components/handles'
import { ShapeNode } from '+components/shape'
import { ShapeIndicator } from '+components/shape-indicator'

interface PageProps<T extends TLShape, M extends Record<string, unknown>> {
  page: TLPage<T, TLBinding>
  pageState: TLPageState
  hideBounds: boolean
  hideHandles: boolean
  hideIndicators: boolean
  meta?: M
}

/**
 * The Page component renders the current page.
 */
export const Page = React.memo(function Page<T extends TLShape, M extends Record<string, unknown>>({
  page,
  pageState,
  hideBounds,
  hideHandles,
  hideIndicators,
  meta,
}: PageProps<T, M>): JSX.Element {
  const { callbacks, shapeUtils, inputs } = useTLContext()

  const shapeTree = useShapeTree(
    page,
    pageState,
    shapeUtils,
    [inputs.bounds.width, inputs.bounds.height],
    meta,
    callbacks.onRenderCountChange
  )

  const { bounds, isLocked, rotation } = useSelection(page, pageState, shapeUtils)

  const {
    selectedIds,
    hoveredId,
    camera: { zoom },
  } = pageState

  let showCloneButtons = false
  let shapeWithHandles: TLShape | undefined = undefined

  if (selectedIds.length === 1) {
    const id = selectedIds[0]

    const shape = page.shapes[id]

    const utils = shapeUtils[shape.type] as TLShapeUtil<any, any>

    showCloneButtons = utils.canClone

    if (shape.handles !== undefined) {
      shapeWithHandles = shape
    }
  }

  return (
    <>
      {bounds && <BoundsBg bounds={bounds} rotation={rotation} isHidden={hideBounds} />}
      {shapeTree.map((node) => (
        <ShapeNode key={node.shape.id} utils={shapeUtils} {...node} />
      ))}
      {!hideIndicators &&
        selectedIds
          .map((id) => page.shapes[id])
          .filter(Boolean)
          .map((shape) => (
            <ShapeIndicator key={'selected_' + shape.id} shape={shape} meta={meta} isSelected />
          ))}
      {!hideIndicators && hoveredId && (
        <ShapeIndicator
          key={'hovered_' + hoveredId}
          shape={page.shapes[hoveredId]}
          meta={meta}
          isHovered
        />
      )}
      {bounds && (
        <Bounds
          zoom={zoom}
          bounds={bounds}
          viewportWidth={inputs.bounds.width}
          isLocked={isLocked}
          rotation={rotation}
          isHidden={hideBounds}
          showCloneButtons={showCloneButtons}
        />
      )}
      {!hideHandles && shapeWithHandles && <Handles shape={shapeWithHandles} />}
    </>
  )
})
