import { Vec } from '@tldraw/vec'
import * as React from 'react'
import { useTLContext } from '~hooks'
import type {
  IShapeTreeNode,
  TLAssets,
  TLBinding,
  TLBounds,
  TLPage,
  TLPageState,
  TLShape,
} from '~types'
import { Utils } from '~utils'

function addToShapeTree<T extends TLShape, M extends Record<string, unknown>>(
  shape: T,
  branch: IShapeTreeNode<T, M>[],
  shapes: TLPage<T, TLBinding>['shapes'],
  pageState: TLPageState & {
    bindingTargetId?: string | null
  },
  assets: TLAssets,
  isChildOfGhost = false,
  isChildOfSelected = false,
  meta?: M
) {
  // Create a node for this shape
  const node: IShapeTreeNode<T, M> = {
    shape,
    asset: shape.assetId ? assets[shape.assetId] : undefined,
    meta: meta as any,
    isChildOfSelected,
    isGhost: shape.isGhost || isChildOfGhost,
    isEditing: pageState.editingId === shape.id,
    isBinding: pageState.bindingTargetId === shape.id,
    isSelected: pageState.selectedIds.includes(shape.id),
    isHovered:
      // The shape is hovered..
      pageState.hoveredId === shape.id ||
      // Or the shape has children and...
      (shape.children !== undefined &&
        // One of the children is hovered
        ((pageState.hoveredId && shape.children.includes(pageState.hoveredId)) ||
          // Or one of the children is selected
          shape.children.some((childId) => pageState.selectedIds.includes(childId)))),
  }

  // Add the node to the branch
  branch.push(node)

  // If the shape has children, add nodes for each child to the node's children array
  if (shape.children) {
    node.children = []

    shape.children
      .map((id) => shapes[id])
      .filter(Boolean) // TODO: Find cases where shapes would be missing.
      .sort((a, b) => a.childIndex - b.childIndex)
      .forEach((childShape) =>
        addToShapeTree(
          childShape,
          node.children!,
          shapes,
          pageState,
          assets,
          node.isGhost,
          node.isSelected || node.isChildOfSelected,
          meta
        )
      )
  }
}

function shapeIsInViewport(bounds: TLBounds, viewport: TLBounds) {
  return Utils.boundsContain(viewport, bounds) || Utils.boundsCollide(viewport, bounds)
}

export function useShapeTree<T extends TLShape, M extends Record<string, unknown>>(
  page: TLPage<T, TLBinding>,
  pageState: TLPageState,
  assets: TLAssets,
  meta?: M
) {
  const { callbacks, shapeUtils, bounds } = useTLContext()

  const rTimeout = React.useRef<unknown>()
  const rPreviousCount = React.useRef(-1)
  const rShapesIdsToRender = React.useRef(new Set<string>())
  const rShapesToRender = React.useRef(new Set<TLShape>())

  const { selectedIds, camera } = pageState

  // Filter the page's shapes down to only those that:
  // - are the direct child of the page
  // - collide with or are contained by the viewport
  // - OR are selected

  const [minX, minY] = Vec.sub(Vec.div([0, 0], camera.zoom), camera.point)
  const [maxX, maxY] = Vec.sub(Vec.div([bounds.width, bounds.height], camera.zoom), camera.point)
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

  const allShapes = Object.values(page.shapes)

  allShapes
    .filter(
      (shape) =>
        // Always render shapes that are flagged as stateful
        shapeUtils[shape.type as T['type']].isStateful ||
        // Always render selected shapes (this preserves certain drag interactions)
        selectedIds.includes(shape.id) ||
        // Otherwise, only render shapes that are in view
        shapeIsInViewport(shapeUtils[shape.type as T['type']].getBounds(shape as any), viewport)
    )
    .forEach((shape) => {
      // If the shape's parent is the page, add it to our sets of shapes to render
      if (shape.parentId === page.id) {
        shapesIdsToRender.add(shape.id)
        shapesToRender.add(shape)
        return
      }

      // If the shape's parent is a different shape (e.g. a group),
      // add the parent to the sets of shapes to render. The parent's
      // children will all be rendered.
      const parent = page.shapes[shape.parentId]

      if (parent === undefined) {
        throw Error(`A shape (${shape.id}) has a parent (${shape.parentId}) that does not exist!`)
      } else {
        shapesIdsToRender.add(parent.id)
        shapesToRender.add(parent)
      }
    })

  // Call onRenderCountChange callback when number of rendering shapes changes

  if (shapesToRender.size !== rPreviousCount.current) {
    // Use a timeout to clear call stack, in case the onChange handler
    // produces a new state change, which could cause nested state
    // changes, which is bad in React.
    if (rTimeout.current) {
      clearTimeout(rTimeout.current as number)
    }
    rTimeout.current = requestAnimationFrame(() => {
      callbacks.onRenderCountChange?.(Array.from(shapesIdsToRender.values()))
    })
    rPreviousCount.current = shapesToRender.size
  }

  const bindingTargetId = pageState.bindingId ? page.bindings[pageState.bindingId].toId : undefined

  // Populate the shape tree

  const tree: IShapeTreeNode<T, M>[] = []

  shapesToRender.forEach((shape) => {
    if (shape === undefined) {
      throw Error('Rendered shapes included a missing shape')
    }

    addToShapeTree(
      shape,
      tree,
      page.shapes,
      { ...pageState, bindingTargetId },
      assets,
      shape.isGhost,
      false,
      meta
    )
  })

  tree.sort((a, b) => a.shape.childIndex - b.shape.childIndex)

  return tree
}
