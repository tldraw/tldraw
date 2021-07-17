import { useSelector } from 'state'
import { ShapeTreeNode } from 'types'
import ShapeComponent from './shape'

export default function Page(): JSX.Element {
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
    isBinding,
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
        isBinding={isBinding}
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
