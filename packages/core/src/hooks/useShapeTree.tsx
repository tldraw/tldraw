import * as React from 'react'
import type {
  IShapeTreeNode,
  TLPage,
  TLPageState,
  TLShape,
  TLShapeUtils,
  TLCallbacks,
  TLBinding,
} from '+types'
import { Utils, Vec } from '+utils'

function addToShapeTree<T extends TLShape, M extends Record<string, unknown>>(
  shape: TLShape,
  branch: IShapeTreeNode<M>[],
  shapes: TLPage<T, TLBinding>['shapes'],
  selectedIds: string[],
  pageState: {
    bindingId?: string
    hoveredId?: string
    currentParentId?: string
    editingId?: string
    editingBindingId?: string
  },
  meta?: M
) {
  const node: IShapeTreeNode<M> = {
    shape,
    isCurrentParent: pageState.currentParentId === shape.id,
    isEditing: pageState.editingId === shape.id,
    isBinding: pageState.bindingId === shape.id,
    meta,
  }

  branch.push(node)

  if (shape.children) {
    node.children = []
    shape.children
      .map((id) => shapes[id])
      .sort((a, b) => a.childIndex - b.childIndex)
      .forEach((childShape) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        addToShapeTree(childShape, node.children!, shapes, selectedIds, pageState, meta)
      )
  }
}

export function useShapeTree<T extends TLShape, M extends Record<string, unknown>>(
  page: TLPage<T, TLBinding>,
  pageState: TLPageState,
  shapeUtils: TLShapeUtils<T>,
  meta?: M,
  onChange?: TLCallbacks['onChange']
) {
  const rPreviousCount = React.useRef(0)

  if (typeof window === 'undefined') return []

  const { selectedIds, camera } = pageState

  // Find viewport

  const [minX, minY] = Vec.sub(Vec.div([0, 0], camera.zoom), camera.point)

  const [maxX, maxY] = Vec.sub(
    Vec.div([window.innerWidth, window.innerHeight], camera.zoom),
    camera.point
  )

  const viewport = {
    minX,
    minY,
    maxX,
    maxY,
    height: maxX - minX,
    width: maxY - minY,
  }

  // Filter shapes that are in view

  const shapesToRender = Object.values(page.shapes).filter((shape) => {
    if (shape.parentId !== page.id) return false

    // Don't hide selected shapes (this breaks certain drag interactions)
    if (pageState.selectedIds.includes(shape.id)) return true

    const shapeBounds = shapeUtils[shape.type as T['type']].getBounds(shape)

    return (
      // TODO: Some shapes should always render (lines, rays)
      Utils.boundsContain(viewport, shapeBounds) || Utils.boundsCollide(viewport, shapeBounds)
    )
  })

  // Call onChange callback when number of rendering shapes changes

  if (shapesToRender.length !== rPreviousCount.current) {
    // Use a timeout to clear call stack, in case the onChange handleer
    // produces a new state change (React won't like that)
    setTimeout(() => onChange?.(shapesToRender.map((shape) => shape.id)), 0)
    rPreviousCount.current = shapesToRender.length
  }

  // Populate the shape tree

  const tree: IShapeTreeNode<M>[] = []

  shapesToRender
    .sort((a, b) => a.childIndex - b.childIndex)
    .forEach((shape) => addToShapeTree(shape, tree, page.shapes, selectedIds, pageState, meta))

  return tree
}
