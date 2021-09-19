/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import type { TLBinding, TLPage, TLPageState, TLShape } from '+types'
import { useSelection, useShapeTree, useHandles, useTLContext } from '+hooks'
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
export function Page<T extends TLShape, M extends Record<string, unknown>>({
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
    inputs.size,
    meta,
    callbacks.onRenderCountChange
  )

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
        <ShapeNode key={node.shape.id} utils={shapeUtils} {...node} />
      ))}
      {bounds && !hideBounds && (
        <Bounds
          zoom={zoom}
          bounds={bounds}
          viewportWidth={inputs.size[0]}
          isLocked={isLocked}
          rotation={rotation}
        />
      )}
      {!hideIndicators &&
        selectedIds
          .filter(Boolean)
          .map((id) => (
            <ShapeIndicator key={'selected_' + id} shape={page.shapes[id]} meta={meta} isSelected />
          ))}
      {!hideIndicators && hoveredId && (
        <ShapeIndicator
          key={'hovered_' + hoveredId}
          shape={page.shapes[hoveredId]}
          meta={meta}
          isHovered
        />
      )}
      {!hideHandles && shapeWithHandles && <Handles shape={shapeWithHandles} />}
    </>
  )
}
