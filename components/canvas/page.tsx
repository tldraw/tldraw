import { useSelector } from 'state'
import tld from 'utils/tld'
import { Data, Shape, ShapeType } from 'types'
import { getShapeUtils } from 'state/shape-utils'
import { boundsCollide, boundsContain } from 'utils'
import ShapeComponent from './shape'

/* 
On each state change, populate a tree structure with all of
the shapes that we need to render..
*/

interface Node {
  shape: Shape
  children: Node[]
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isDarkMode: boolean
  isCurrentParent: boolean
}

export default function Page(): JSX.Element {
  // Get a tree of shapes to render
  const shapeTree = useSelector((s) => {
    // Get the shapes that fit into the current viewport

    const viewport = tld.getViewport(s.data)

    const shapesToShow = s.values.currentShapes.filter((shape) => {
      const shapeBounds = getShapeUtils(shape).getBounds(shape)

      return (
        shape.type === ShapeType.Ray ||
        shape.type === ShapeType.Line ||
        boundsContain(viewport, shapeBounds) ||
        boundsCollide(viewport, shapeBounds)
      )
    })

    // Should we allow shapes to be hovered?
    const allowHovers = s.isInAny('selecting', 'text', 'editingShape')

    // Populate the shape tree
    const tree: Node[] = []

    shapesToShow.forEach((shape) =>
      addToTree(s.data, s.values.selectedIds, allowHovers, tree, shape)
    )

    return tree
  })

  return (
    <>
      {shapeTree.map((node) => (
        <ShapeNode key={node.shape.id} node={node} />
      ))}
    </>
  )
}

interface ShapeNodeProps {
  node: Node
  parentPoint?: number[]
}

const ShapeNode = ({
  node: {
    shape,
    children,
    isEditing,
    isHovered,
    isDarkMode,
    isSelected,
    isCurrentParent,
  },
}: ShapeNodeProps) => {
  return (
    <>
      <ShapeComponent
        shape={shape}
        isEditing={isEditing}
        isHovered={isHovered}
        isSelected={isSelected}
        isDarkMode={isDarkMode}
        isCurrentParent={isCurrentParent}
      />
      {children.map((childNode) => (
        <ShapeNode key={childNode.shape.id} node={childNode} />
      ))}
    </>
  )
}

/**
 * Populate the shape tree. This helper is recursive and only one call is needed.
 *
 * ### Example
 *
 *```ts
 * addDataToTree(data, selectedIds, allowHovers, branch, shape)
 *```
 */
function addToTree(
  data: Data,
  selectedIds: string[],
  allowHovers: boolean,
  branch: Node[],
  shape: Shape
): void {
  const node = {
    shape,
    children: [],
    isHovered: data.hoveredId === shape.id,
    isCurrentParent: data.currentParentId === shape.id,
    isEditing: data.editingId === shape.id,
    isDarkMode: data.settings.isDarkMode,
    isSelected: selectedIds.includes(shape.id),
  }

  branch.push(node)

  if (shape.children) {
    shape.children
      .map((id) => tld.getShape(data, id))
      .sort((a, b) => a.childIndex - b.childIndex)
      .forEach((childShape) => {
        addToTree(data, selectedIds, allowHovers, node.children, childShape)
      })
  }
}
