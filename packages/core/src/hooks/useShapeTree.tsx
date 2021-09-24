/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { IShapeTreeNode, TLPage, TLPageState, TLShape, TLBinding, TLBounds } from '+types'
import { Utils } from '+utils'
import { Vec } from '@tldraw/vec'
import { useTLContext } from '+hooks'
import { MINIMAP_HEIGHT, MINIMAP_WIDTH } from '+constants'

function addToShapeTree<T extends TLShape, M extends Record<string, unknown>>(
  shape: T,
  branch: IShapeTreeNode<T, M>[],
  shapes: TLPage<T, TLBinding>['shapes'],
  info: {
    bindingTargetId?: string | null
    bindingId?: string | null
    hoveredId?: string | null
    selectedIds: string[]
    currentParentId?: string | null
    editingId?: string | null
    editingBindingId?: string | null
    meta?: M
  }
) {
  // Create a node for this shape
  const node: IShapeTreeNode<T, M> = {
    shape,
    meta: info.meta as any,
    isCurrentParent: info.currentParentId === shape.id,
    isEditing: info.editingId === shape.id,
    isBinding: info.bindingTargetId === shape.id,
    isSelected: info.selectedIds.includes(shape.id),
    isHovered:
      // The shape is hovered..
      info.hoveredId === shape.id ||
      // Or the shape has children and...
      (shape.children !== undefined &&
        // One of the children is hovered
        ((info.hoveredId && shape.children.includes(info.hoveredId)) ||
          // Or one of the children is selected
          shape.children.some((childId) => info.selectedIds.includes(childId)))),
  }

  // Add the node to the branch
  branch.push(node)

  // If the shape has children, add nodes for each child to the node's children array
  if (shape.children) {
    node.children = []

    shape.children
      .map((id) => shapes[id])
      .sort((a, b) => a.childIndex - b.childIndex)
      .forEach((childShape) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        addToShapeTree(childShape, node.children!, shapes, info)
      )
  }
}

function shapeIsInViewport(bounds: TLBounds, viewport: TLBounds) {
  return Utils.boundsContain(viewport, bounds) || Utils.boundsCollide(viewport, bounds)
}

export function useShapeTree<T extends TLShape, M extends Record<string, unknown>>(
  page: TLPage<T, TLBinding>,
  pageState: TLPageState,
  meta?: M
) {
  const { shapeUtils, callbacks, inputs } = useTLContext()

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
  const [maxX, maxY] = Vec.sub(
    Vec.div([inputs.bounds.width, inputs.bounds.height], camera.zoom),
    camera.point
  )

  const viewport = {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.abs(maxX - minX),
    height: Math.abs(maxY - minY),
  }

  const shapeBounds: Record<string, TLBounds> = {}
  const shapesToRender = rShapesToRender.current
  const shapesIdsToRender = rShapesIdsToRender.current

  shapesToRender.clear()
  shapesIdsToRender.clear()

  const allShapes = Object.values(page.shapes).sort((a, b) => a.childIndex - b.childIndex)

  allShapes.forEach((shape) => {
    const bounds = shapeUtils[shape.type as T['type']].getBounds(shape)
    shapeBounds[shape.id] = bounds

    // Don't hide selected shapes (this breaks certain drag interactions)
    if (selectedIds.includes(shape.id) || shapeIsInViewport(bounds, viewport)) {
      if (shape.parentId === page.id) {
        shapesIdsToRender.add(shape.id)
        shapesToRender.add(shape)
      }
    }
  })

  // Call onChange callback when number of rendering shapes changes

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

  const info = { ...pageState, bindingTargetId, meta }

  shapesToRender.forEach((shape) => addToShapeTree(shape, tree, page.shapes, info))

  const minimapShapes: { shape: T; bounds: TLBounds }[] = []

  const commonBounds = Utils.getCommonBounds([viewport, ...Object.values(shapeBounds)])

  // Map component size
  const mh = MINIMAP_HEIGHT
  const mw = MINIMAP_WIDTH

  const l = commonBounds.minX
  const r = commonBounds.maxX
  const t = commonBounds.minY
  const b = commonBounds.maxY
  const w = commonBounds.width
  const h = commonBounds.height

  const iw = w < h ? mw * (w / h) : mw
  const ih = w > h ? mh * (h / w) : mh
  const il = w < h ? (mw - iw) / 2 : 0
  const it = w > h ? (mh - ih) / 2 : 0

  const vp = {
    minX: il + iw * ((viewport.minX - l) / w),
    minY: it + ih * ((viewport.minY - t) / h),
    maxX: il + iw * ((viewport.maxX - r) / w),
    maxY: it + ih * ((viewport.maxY - b) / h),
    width: iw * (viewport.width / w),
    height: ih * (viewport.height / h),
  }

  allShapes.forEach((shape) => {
    const bounds = shapeBounds[shape.id]

    minimapShapes.push({
      shape,
      bounds: {
        minX: il + iw * ((bounds.minX - l) / w),
        minY: it + ih * ((bounds.minY - t) / h),
        maxX: il + iw * ((bounds.maxX - r) / w),
        maxY: it + ih * ((bounds.maxY - b) / h),
        width: (iw * bounds.width) / w,
        height: (ih * bounds.height) / h,
      },
    })
  })

  return {
    allShapes,
    shapeTree: tree,
    viewport,
    commonBounds,
    minimap: {
      mapBounds: {
        minX: il,
        minY: it,
        maxX: il + iw,
        maxY: it + ih,
        width: iw,
        height: ih,
      },
      viewport: vp,
      shapes: minimapShapes,
    },
  }
}
