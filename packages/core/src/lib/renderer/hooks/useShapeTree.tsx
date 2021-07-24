import {
  ShapeTreeNode,
  TLPage,
  TLPageState,
  TLShape,
  TLShapeUtils,
} from '../../types'
import Utils, { Vec } from '../../utils'

function addToShapeTree<T extends TLShape>(
  shape: TLShape,
  branch: ShapeTreeNode[],
  shapes: TLPage<T>['shapes'],
  selectedIds: string[],
  info: {
    bindingId?: string
    hoveredId?: string
    currentParentId?: string
    editingId?: string
    editingBindingId?: string
    isDarkMode?: boolean
  }
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
      .forEach((childShape) =>
        addToShapeTree(childShape, node.children, shapes, selectedIds, info)
      )
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
  } = {}
) {
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

  const shapesToShow = Object.values(page.shapes).filter((shape) => {
    if (shape.parentId !== page.id) return false

    const shapeBounds = shapeUtils[shape.type].getBounds(shape)

    return (
      // shapeUtils.alwaysRender? (for lines, rays, etc)
      Utils.boundsContain(viewport, shapeBounds) ||
      Utils.boundsCollide(viewport, shapeBounds)
    )
  })

  // Populate the shape tree
  const tree: ShapeTreeNode[] = []

  shapesToShow
    .sort((a, b) => a.childIndex - b.childIndex)
    .forEach((shape) =>
      addToShapeTree(shape, tree, page.shapes, selectedIds, info)
    )

  return tree
}
