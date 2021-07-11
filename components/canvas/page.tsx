import { useSelector } from 'state'
import { ShapeTreeNode } from 'types'
import ShapeComponent from './shape'

/* 
On each state change, populate a tree structure with all of
the shapes that we need to render..
*/

export default function Page(): JSX.Element {
  // Get a tree of shapes to render
  const shapesToRender = useSelector((s) => s.values.shapesToRender)
  const allowHovers = useSelector((s) =>
    s.isInAny('selecting', 'text', 'editingShape')
  )

  return (
    <>
      {shapesToRender.map((node) => (
        <ShapeNode key={node.shape.id} node={node} allowHovers={allowHovers} />
      ))}
    </>
  )
}

interface ShapeNodeProps {
  node: ShapeTreeNode
  allowHovers: boolean
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
  allowHovers,
}: ShapeNodeProps) => {
  return (
    <>
      <ShapeComponent
        shape={shape}
        isEditing={isEditing}
        isHovered={allowHovers && isHovered}
        isSelected={isSelected}
        isDarkMode={isDarkMode}
        isCurrentParent={isCurrentParent}
      />
      {children.map((childNode) => (
        <ShapeNode
          key={childNode.shape.id}
          node={childNode}
          allowHovers={allowHovers}
        />
      ))}
    </>
  )
}
