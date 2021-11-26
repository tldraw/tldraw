/* eslint-disable @typescript-eslint/no-explicit-any */
import { observer } from 'mobx-react-lite'
import * as React from 'react'
import type { TLBinding, TLPage, TLPageState, TLShape } from '~types'
import { useSelection, useShapeTree, useTLContext } from '~hooks'
import { Bounds } from '~components/bounds'
import { BoundsBg } from '~components/bounds/bounds-bg'
import { Handles } from '~components/handles'
import { ShapeNode } from '~components/shape'
import { ShapeIndicator } from '~components/shape-indicator'
import type { TLShapeUtil } from '~TLShapeUtil'

interface PageProps<T extends TLShape, M extends Record<string, unknown>> {
  page: TLPage<T, TLBinding>
  pageState: TLPageState
  hideBounds: boolean
  hideHandles: boolean
  hideIndicators: boolean
  hideBindingHandles: boolean
  hideCloneHandles: boolean
  hideRotateHandle: boolean
  hideResizeHandles: boolean
  meta?: M
}

/**
 * The Page component renders the current page.
 */
export const Page = observer(function _Page<T extends TLShape, M extends Record<string, unknown>>({
  page,
  pageState,
  hideBounds,
  hideHandles,
  hideIndicators,
  hideBindingHandles,
  hideCloneHandles,
  hideRotateHandle,
  hideResizeHandles,
  meta,
}: PageProps<T, M>): JSX.Element {
  const { bounds: rendererBounds, shapeUtils } = useTLContext()

  const shapeTree = useShapeTree(page, pageState, meta)

  const { bounds, isLinked, isLocked, rotation } = useSelection(page, pageState, shapeUtils)

  const {
    selectedIds,
    hoveredId,
    camera: { zoom },
  } = pageState

  let _hideCloneHandles = true

  // Does the selected shape have handles?
  let shapeWithHandles: TLShape | undefined = undefined

  const selectedShapes = selectedIds.map((id) => page.shapes[id])

  if (selectedShapes.length === 1) {
    const shape = selectedShapes[0]

    const utils = shapeUtils[shape.type] as TLShapeUtil<any, any>

    _hideCloneHandles = hideCloneHandles || !utils.showCloneHandles

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
        selectedShapes.map((shape) => (
          <ShapeIndicator
            key={'selected_' + shape.id}
            shape={shape}
            meta={meta as any}
            isSelected
          />
        ))}
      {!hideIndicators && hoveredId && (
        <ShapeIndicator
          key={'hovered_' + hoveredId}
          shape={page.shapes[hoveredId]}
          meta={meta as any}
          isHovered
        />
      )}
      {bounds && (
        <Bounds
          zoom={zoom}
          bounds={bounds}
          viewportWidth={rendererBounds.width}
          isLocked={isLocked}
          rotation={rotation}
          isHidden={hideBounds}
          hideRotateHandle={hideRotateHandle}
          hideResizeHandles={hideResizeHandles}
          hideBindingHandles={hideBindingHandles || !isLinked}
          hideCloneHandles={_hideCloneHandles}
        />
      )}
      {!hideHandles && shapeWithHandles && <Handles shape={shapeWithHandles} zoom={zoom} />}
    </>
  )
})
