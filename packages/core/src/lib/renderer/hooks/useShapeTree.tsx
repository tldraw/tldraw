import * as React from 'react'
import { IShapeTreeNode, TLPage, TLPageState, TLShape, TLBounds, TLShapeUtil, TLShapeUtils } from '../../types'
import Utils, { Vec } from '../../utils'
import { TLContext, useTLContext } from './useTLContext'

function addToShapeTree<T extends TLShape>(
  shape: TLShape,
  branch: IShapeTreeNode[],
  shapes: TLPage<T>['shapes'],
  selectedIds: string[],
  info: {
    bindingId?: string
    hoveredId?: string
    currentParentId?: string
    editingId?: string
    editingBindingId?: string
    isDarkMode?: boolean
  },
) {
  const node = {
    shape,
    children: [],
    isHovered: info.hoveredId === shape.id,
    isCurrentParent: info.currentParentId === shape.id,
    isEditing: info.editingId === shape.id,
    isBinding: info.bindingId === shape.id,
    isDarkMode: info.isDarkMode || false,
    isSelected: selectedIds.includes(shape.id),
  }

  branch.push(node)

  if (shape.children) {
    shape.children
      .map((id) => shapes[id])
      .sort((a, b) => a.childIndex - b.childIndex)
      .forEach((childShape) => addToShapeTree(childShape, node.children, shapes, selectedIds, info))
  }
}

export function useShapeTree<T extends TLShape>(
  page: TLPage<T>,
  pageState: TLPageState,
  shapeUtils: TLShapeUtils<T>,
  info: {
    bindingId?: string
    hoveredId?: string
    currentParentId?: string
    editingId?: string
    editingBindingId?: string
    isDarkMode?: boolean
  } = {},
  onChange?: (ids: string[]) => void,
) {
  const rPreviousCount = React.useRef(0)

  if (typeof window === 'undefined') return []

  const { selectedIds, camera } = pageState

  // Find viewport

  const [minX, minY] = Vec.sub(Vec.div([0, 0], camera.zoom), camera.point)

  const [maxX, maxY] = Vec.sub(Vec.div([window.innerWidth, window.innerHeight], camera.zoom), camera.point)

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

    const shapeBounds = shapeUtils[shape.type as T['type']].getBounds(shape)

    return (
      // TODO: Some shapes should always render (lines, rays)
      Utils.boundsContain(viewport, shapeBounds) || Utils.boundsCollide(viewport, shapeBounds)
    )
  })

  // Call onChange callback when number of rendering shapes changes

  if (shapesToRender.length !== rPreviousCount.current) {
    onChange?.(shapesToRender.map((shape) => shape.id))
    rPreviousCount.current = shapesToRender.length
  }

  // Populate the shape tree

  const tree: IShapeTreeNode[] = []

  shapesToRender
    .sort((a, b) => a.childIndex - b.childIndex)
    .forEach((shape) => addToShapeTree(shape, tree, page.shapes, selectedIds, info))

  return tree
}
