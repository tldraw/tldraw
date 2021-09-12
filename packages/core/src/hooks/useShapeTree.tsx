/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type {
  IShapeTreeNode,
  TLPage,
  TLPageState,
  TLShape,
  TLShapeUtils,
  TLCallbacks,
  TLBinding,
  TLBounds,
} from '+types'
import { Utils } from '+utils'
import { Vec } from '@tldraw/vec'

function addToShapeTree<T extends TLShape, M extends Record<string, unknown>>(
  shape: T,
  branch: IShapeTreeNode<T, M>[],
  shapes: TLPage<T, TLBinding>['shapes'],
  pageState: {
    bindingTargetId?: string | null
    bindingId?: string | null
    hoveredId?: string | null
    selectedIds: string[]
    currentParentId?: string | null
    editingId?: string | null
    editingBindingId?: string | null
  },
  meta?: M
) {
  const node: IShapeTreeNode<T, M> = {
    shape,
    isCurrentParent: pageState.currentParentId === shape.id,
    isEditing: pageState.editingId === shape.id,
    isSelected: pageState.selectedIds.includes(shape.id),
    isHovered: pageState.hoveredId
      ? pageState.hoveredId === shape.id ||
        (shape.children ? shape.children.includes(pageState.hoveredId) : false)
      : false,
    isBinding: pageState.bindingTargetId === shape.id,
    meta: meta as any,
  }

  branch.push(node)

  if (shape.children) {
    node.children = []
    shape.children
      .map((id) => shapes[id])
      .sort((a, b) => a.childIndex - b.childIndex)
      .forEach((childShape) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        addToShapeTree(childShape, node.children!, shapes, pageState, meta)
      )
  }
}

function shapeIsInViewport(bounds: TLBounds, viewport: TLBounds) {
  return Utils.boundsContain(viewport, bounds) || Utils.boundsCollide(viewport, bounds)
}

export function useShapeTree<
  T extends TLShape,
  E extends Element,
  M extends Record<string, unknown>
>(
  page: TLPage<T, TLBinding>,
  pageState: TLPageState,
  shapeUtils: TLShapeUtils<T, E>,
  size: number[],
  meta?: M,
  onRenderCountChange?: TLCallbacks<T>['onRenderCountChange']
) {
  const rTimeout = React.useRef<unknown>()
  const rPreviousCount = React.useRef(0)
  const rShapesIdsToRender = React.useRef(new Set<string>())
  const rShapesToRender = React.useRef(new Set<TLShape>())

  const { selectedIds, camera } = pageState

  // Filter the page's shapes down to only those that:
  // - are the direct child of the page
  // - collide with or are contained by the viewport
  // - OR are selected

  const [minX, minY] = Vec.sub(Vec.div([0, 0], camera.zoom), camera.point)
  const [maxX, maxY] = Vec.sub(Vec.div(size, camera.zoom), camera.point)
  const viewport = {
    minX,
    minY,
    maxX,
    maxY,
    height: maxX - minX,
    width: maxY - minY,
  }

  const shapesToRender = rShapesToRender.current
  const shapesIdsToRender = rShapesIdsToRender.current

  shapesToRender.clear()
  shapesIdsToRender.clear()

  Object.values(page.shapes)
    .filter((shape) => {
      // Don't hide selected shapes (this breaks certain drag interactions)
      if (
        selectedIds.includes(shape.id) ||
        shapeIsInViewport(shapeUtils[shape.type as T['type']].getBounds(shape), viewport)
      ) {
        if (shape.parentId === page.id) {
          shapesIdsToRender.add(shape.id)
          shapesToRender.add(shape)
        } else {
          shapesIdsToRender.add(shape.parentId)
          shapesToRender.add(page.shapes[shape.parentId])
        }
      }
    })
    .sort((a, b) => a.childIndex - b.childIndex)

  // Call onChange callback when number of rendering shapes changes

  if (shapesToRender.size !== rPreviousCount.current) {
    // Use a timeout to clear call stack, in case the onChange handler
    // produces a new state change, which could cause nested state
    // changes, which is bad in React.
    if (rTimeout.current) {
      clearTimeout(rTimeout.current as number)
    }
    rTimeout.current = setTimeout(() => {
      onRenderCountChange?.(Array.from(shapesIdsToRender.values()))
    }, 100)
    rPreviousCount.current = shapesToRender.size
  }

  const bindingTargetId = pageState.bindingId ? page.bindings[pageState.bindingId].toId : undefined

  // Populate the shape tree

  const tree: IShapeTreeNode<T, M>[] = []

  const info = { ...pageState, bindingTargetId }

  shapesToRender.forEach((shape) => addToShapeTree(shape, tree, page.shapes, info, meta))

  return tree
}
